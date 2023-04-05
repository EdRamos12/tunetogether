import assert, { AssertionError } from "assert";
import { NextApiRequest, NextApiResponse } from "next";
import findUser from "../../utils/findUser";
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

async function createUser(client: MongoClient, dbName: string, email: string, password: string, username: string, callback: createUserCallbackInterface) {
  const collection = client.db(dbName).collection("user");
  const userId = v4();
  hash(password, 10, async function (_, hash) {
    // guardar hash no db
    const userCreated = await collection.insertOne({userId, email, password: hash});
    callback(userCreated, email, userId, username);
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
  
      await client.connect();

      try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await findUser(client, process.env.DB_NAME as string, email);

        if (!user || user == null) {
          await client.close();
          return res.status(401).json({ error: true, message: "E-mail/Senha Incorreto" });
        }

        authUser(password, user.password, async (err: Error, resp: any) => {
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
          await client.close();
          return res.status(200).json(exceptPassword);
        });
      } catch (err) {
        await client.close();
        return res.status(500).json({ error: true, message: "Erro ao achar usuário: " + err });
      }

      
    } catch (bodyError: AssertionError | any) {
      await client.close();
      return res.status(403).json({ error: true, message: bodyError.message });
    }
  }

  async register(req: NextApiRequest, res: NextApiResponse) {
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
  
      await client.connect();

      const email = req.body.email;
      const password = req.body.password;
      const username = req.body.username;

      const user = await findUser(client, process.env.DB_NAME as string, email);

      try {
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
                client.close();
                return res.status(201).json(creationResult);
              } else {
                client.close();
                return res.status(500).json({ error: true, message: "Erro ao criar usuario, ve os logs irmao: "+creationResult });
              }
            }
          );
        } else {
          // if user exists, return with error
          client.close();
          return res.status(403).json({ error: true, message: "Email ja existe." });
        } 
      } catch (err) {
        return res.status(500).json({ error: true, message: "Erro ao achar usuário: "+err });;
      }
  }

  logout(_: NextApiRequest, res: NextApiResponse) {
    setCookie(res, "__bruh", "", cookieOptions);
    return res.status(200);
  }
}