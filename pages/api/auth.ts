import assert, { AssertionError } from "assert";
import { compare } from "bcrypt";
import { MongoClient } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import findUser, { userInterfaceDB } from "../utils/findUser";
import client from "./client";

function authUser(db: any, email: string, password: string, hash: string, callback: any) {
  const collection = db.collection('user');
  compare(password, hash, callback);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      assert.notEqual(null, req.body.email, "Precisa colocar e-mail!");
      assert.notEqual(null, req.body.password, "Precisa colocar uma senha!");
    } catch (bodyError: AssertionError | any) {
      res.status(403).json({ error: true, message: bodyError.message });
      return;
    }

    client.connect(function (err, result) {
      const email = req.body.email;
      const password = req.body.password;
      findUser(client, process.env.DB_NAME as string, email, function (err: Error, user: userInterfaceDB | null) {
        if (err) {
          res.status(500).json({ error: true, message: "Erro ao achar usuário" });
          return;
        }
        if (!user) {
          res.status(401).json({ error: true, message: "E-mail/Senha Incorreto" });
          return;
        } else {
          
        }
      });
    });
  }
}