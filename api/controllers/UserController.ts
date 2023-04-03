import assert, { AssertionError } from "assert";
import { NextApiRequest, NextApiResponse } from "next";
import findUser, { userInterfaceDB } from "../../utils/findUser";
import client from "../../utils/client";
import { sign } from "jsonwebtoken";
import setCookie from "../../utils/setCookie";
import cookieOptions from "../../config/cookieOptions";
import authUser from "../../utils/authUser";
import { InsertOneResult, MongoClient } from "mongodb";
import { hash } from "bcrypt";
import { v4 } from "uuid";

interface createUserCallbackInterface {(
  creationResult: InsertOneResult<Document> | undefined,
  email: string,
  userId: string,
  username: string
): void | null;}

function createUser(client: MongoClient, dbName: string, email: string, password: string, username: string, callback: createUserCallbackInterface) {
  const collection = client.db(dbName).collection("user");
  const userId = v4();
  hash(password, 10, function (_, hash) {
    // guardar hash no db
    collection.insertOne(
      {
        userId,
        email,
        password: hash,
      },
      function (err, userCreated) {
        assert.equal(err, null);
        callback(userCreated, email, userId, username);
      }
    );
  });
}

function validateEmail(email: string) {
  const res =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return res.test(String(email).toLowerCase());
}

export default class UserController {
  async login(req: NextApiRequest, res: NextApiResponse) {
    try {
      assert.notEqual(null, req.body.email, "Precisa colocar e-mail!");
      assert.notEqual(null, req.body.password, "Precisa colocar uma senha!");
  
      return new Promise(() => { // wrapped around promised, so nextjs won't complain
        return client.connect(() => {
          const email = req.body.email;
          const password = req.body.password;
          findUser(client, process.env.DB_NAME as string, email, function (err: Error, user: userInterfaceDB | null) {
            if (!user || user == null) {
              return res.status(401).json({ error: true, message: "E-mail/Senha Incorreto" });
            } 
      
            if (err) {
              return res.status(500).json({ error: true, message: "Erro ao achar usuário: "+err.message });
            }
      
              authUser(password, user.password, (err: Error, resp: any) => {
                if (err) return res.status(500).json({ error: true, message: "Erro no sistema: "+err.message });
                if (!resp) return res.status(401).json({ error: true, message: "E-mail/Senha Incorreto" }); // senha incorreta
      
                const token = sign({
                  userId: user!.userId,
                  username: user!.username,
                  email,
                }, process.env.JWT_SECRET as string, {
                    expiresIn: 10800,
                });
                setCookie(res, "__bruh", token, cookieOptions);
                const { password, ...exceptPassword } = user;
                return res.status(200).json(exceptPassword);
              });
          });
        });
      })
    } catch (bodyError: AssertionError | any) {
      return res.status(403).json({ error: true, message: bodyError.message });
    }
  }

  register(req: NextApiRequest, res: NextApiResponse) {
      //registro
      try {
        assert.notEqual(null, req.body.email, "Precisa colocar e-mail!");
        assert.notEqual(null, req.body.password, "Precisa colocar uma senha!");
        if (!validateEmail(req.body.email)) {
          throw { message: "Não é um e-mail válido!" };
        }
        if (req.body.password.length < 8) {
          throw { message: "Senha não é muito longa!" };
        }
      } catch (bodyError: AssertionError | any) {
        res.status(403).json({ error: true, message: bodyError.message });
        return;
      }
  
      client.connect(function (err) {
        console.log(err);
        assert.equal(null, err);
        const email = req.body.email;
        const password = req.body.password;
        const username = req.body.username;
  
        return findUser(client, process.env.DB_NAME as string, email, (err: Error, user: userInterfaceDB | null) => {
            //console.log(user);
            if (err) {
              return res.status(500).json({ error: true, message: "Erro ao achar usuário: "+err.message });;
            }
            if (!user) {
              // if user doesn't exist, then lets create
              createUser(client, process.env.DB_NAME as string, email, password, username, (
                  creationResult: InsertOneResult<Document> | undefined,
                  email: string,
                  userId: string,
                  username: string
                ) => {
                  if (creationResult!.acknowledged === true) { // if created, then return token
                    const token = sign({
                        userId,
                        email,
                        username
                    }, process.env.JWT_SECRET as string, {
                        expiresIn: 10800,
                    });
                    setCookie(res, "__bruh", token, cookieOptions);
                    res.status(201).json(creationResult);
                    return;
                  } else {
                    res.status(500).json({ error: true, message: "Erro ao criar usuario, ve os logs irmao: "+creationResult });
                    return;
                  }
                }
              );
            } else {
              // if user exists, return with error
              res.status(403).json({ error: true, message: "Email ja existe." });
            }
          }
        );
      });
  }

  logout(req: NextApiRequest, res: NextApiResponse) {
    setCookie(res, "__bruh", "", cookieOptions);
    return res.status(200);
  }
}