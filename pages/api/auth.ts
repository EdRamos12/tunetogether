import assert, { AssertionError } from "assert";
import { compare } from "bcrypt";
import { NextApiRequest, NextApiResponse } from "next";
import findUser, { userInterfaceDB } from "../../utils/findUser";
import client from "../../utils/client";
import { sign } from "jsonwebtoken";

async function authUser(password: string, hash: string, callback: any) {
  //const collection = db.collection('user');
  compare(password, hash, callback);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    assert.notEqual(null, req.body.email, "Precisa colocar e-mail!");
    assert.notEqual(null, req.body.password, "Precisa colocar uma senha!");

    return new Promise(resolve => { // wrapped around promised, so nextjs won't complain
      return client.connect(function (err, result) {
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
                email,
              }, process.env.JWT_SECRET as string, {
                  expiresIn: 10800,
              });
              return res.status(200).json({ token });;
            });
        });
      });
    })
  } catch (bodyError: AssertionError | any) {
    return res.status(403).json({ error: true, message: bodyError.message });
  }
}