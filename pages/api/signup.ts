import type { NextApiRequest, NextApiResponse } from "next";
import { InsertOneResult, MongoClient, ObjectId } from "mongodb";
import assert, { AssertionError } from "assert";
import { hash } from "bcrypt";
import { v4 } from "uuid";
import { sign } from "jsonwebtoken";
import findUser, { userInterfaceDB } from "../../utils/findUser";
import client from "../../utils/client";

interface createUserCallbackInterface {(
    creationResult: InsertOneResult<Document> | undefined,
    email: string,
    userId: string
): void | null;}

function createUser(client: MongoClient, dbName: string, email: string, password: string, callback: createUserCallbackInterface) {
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
        callback(userCreated, email, userId);
      }
    );
  });
}

function validateEmail(email: string) {
  const res =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return res.test(String(email).toLowerCase());
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
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

    client.connect(function (err, result) {
      assert.equal(null, err);
      // console.log("Conectado ao server mongo => "+ result!.options.srvHost);
      const email = req.body.email;
      const password = req.body.password;

      return findUser(client, process.env.DB_NAME as string, email, function (err: Error, user: userInterfaceDB | null) {
          //console.log(user);
          if (err) {
            res.status(500).json({ error: true, message: "Erro ao achar usuário" });
            return;
          }
          if (!user) {
            //se n tem usuario, bo criar
            createUser(client, process.env.DB_NAME as string, email, password, function (
                creationResult: InsertOneResult<Document> | undefined,
                email: string,
                userId: string
              ) {
                if (creationResult!.acknowledged === true) {
                  const token = sign({
                      userId,
                      email,
                  }, process.env.JWT_SECRET as string, {
                      expiresIn: 10800,
                  });
                  res.status(200).json({ token });
                  return;
                } else {
                  res.status(500).json({ error: true, message: "Erro ao criar usuario, ve os logs irmao: "+creationResult });
                  return;
                }
              }
            );
          } else {
            // se o usuario existe
            res.status(403).json({ error: true, message: "Email ja existe." });
          }
        }
      );
    });
  }
}

export const config = {
  api: {
    externalResolver: true, //next ur dumb
  },
}