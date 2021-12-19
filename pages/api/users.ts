// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import assert from 'assert';
import { hash } from 'bcrypt';
import { v4 } from 'uuid';
import { sign } from 'jsonwebtoken';

interface callbackType { (creationResult: any): void }

const saltRounds = 10;
const dbName = 'online-party-app';

// type Data = {
//   name: string
// }

const client = new MongoClient(process.env.URI as string, {
  useNewUrlParser: true, 
  useUnifiedTopology: true 
} as any);

function findUser(client: MongoClient, dbName: string, email: string, callback: any) {
  const collection = client.db(dbName).collection('user');
  collection.findOne({email}, callback);
}

function createUser(client: MongoClient, dbName: string, email: string, password: string, callback: any) {
  const collection = client.db(dbName).collection('user');
  const userId = v4()
  hash(password, saltRounds, function(_, hash) {
    // guardar hash no db
    collection.insertOne(
      {
        userId,
        email,
        password: hash
      },
      function (err, userCreated) {
        assert.equal(err, null);
        callback(userCreated, email, userId);
      }
    )
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method === 'POST') {
    //registro
    try {
      assert.notEqual(null, req.body.email, 'Precisa colocar e-mail!');
      assert.notEqual(null, req.body.password, 'Precisa colocar uma senha!');
    } catch (bodyError: any) {
      res.status(403).json({ error: true, message: bodyError.message });
      return;
    }

    client.connect(function(err) {
      assert.equal(null, err);
      console.log('Conectado ao server mongo =>');
      const email = req.body.email;
      const password = req.body.password;

      findUser(client, process.env.DB_NAME as string, email, function(err: Error, user: any) {
        if (err) {
          res.status(500).json({error: true, message: 'Erro ao achar usuário'});
          return;
        }
        if (!user) {
          //se n tem usuario, bo criar
          createUser(client, process.env.DB_NAME as string, email, password, function(creationResult: any, email: any, userId: any) {
            if (creationResult.acknowledged === true) {
              const token = sign({
                userId,
                email,
              }, process.env.JWT_SECRET as string, {
                expiresIn: 10800
              });
              res.status(200).json({token});
              return;
            }
          });
        } else {
          // se o usuario existe
          res.status(403).json({ error: true, message: 'Email ja existe.' })
        }
      
      })
    });
  }
  // return res.status(200).json({ name: 'John Doe' })
}
