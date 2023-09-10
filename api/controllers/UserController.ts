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
      assert.notEqual(null, req.body.email, "You need to put a valid e-mail!");
      assert.notEqual(null, req.body.password, "You need to put a password!");
  
      await client.connect();

      try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await findUser(client, process.env.DB_NAME as string, email);

        if (!user || user == null) {
           
          return res.status(401).json({ error: true, message: "Incorrect e-mail/password! Try again!" }); // e-mail wrong
        }

        authUser(password, user.password, async (err: Error, resp: any) => {
          if (err) return res.status(500).json({ error: true, message: "Erro no sistema: "+err.message });
          if (!resp) return res.status(401).json({ error: true, message: "Incorrect e-mail/password! Try again!" }); // incorrect password

          const token = sign({
            userId: user?.userId,
            username: user?.username,
            email,
          }, process.env.JWT_SECRET as string, {
              expiresIn: 10800,
          });
          setCookie(res, "__secret_token", token, cookieOptions);
          const { password, ...exceptPassword } = user;
           
          return res.status(200).json(exceptPassword);
        });
      } catch (err) {
         
        return res.status(500).json({ error: true, message: "Error while fetching user: " + err });
      }
    } catch (bodyError: AssertionError | any) {
       
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
                setCookie(res, "__secret_token", token, cookieOptions);
                 ;
                return res.status(201).json(creationResult);
              } else {
                 ;
                return res.status(500).json({ error: true, message: "Error while creating user, check logs: "+creationResult });
              }
            }
          );
        } else {
          // if user exists, return with error
           
          return res.status(403).json({ error: true, message: "E-mail already exists, try a different one!" });
        } 
      } catch (err) {
        return res.status(500).json({ error: true, message: "Error while fetching user: "+err });;
      }
  }

  async auth(_: NextApiRequest, res: NextApiResponse) { 
    // this function is going to use the middleware to check things :P
    // don't know if i update the user's token, for now it's a TODO
    return res.status(200).json({ message: 'Ok!' });
  }

  async check_username_availability(req: NextApiRequest, res: NextApiResponse) {
    try {
      const USERNAME_MINIMUM_LENGTH = 3;

      const { username } = req.query;

      if (!username) throw { message: 'You need to put a valid username!', code: 404 };
      
      if (username.length < USERNAME_MINIMUM_LENGTH) throw { message: `Username length should be at least ${USERNAME_MINIMUM_LENGTH}!`, code: 406 };
        
      await client.connect();

      const collection = client.db(process.env.DB_NAME as string).collection("user");

      const username_found = await collection.findOne({ username });

      if (username_found) throw { message: 'Username already in use!', code: 409 };

      return res.status(200).json({ message: 'Username available!' });
    } catch (err: any) {
      return res.status(err.code || 500).json({ message: err.message || err });
    }
  }

  logout(_: NextApiRequest, res: NextApiResponse) {
    setCookie(res, "__secret_token", "", cookieOptions);
    return res.status(200);
  }
}