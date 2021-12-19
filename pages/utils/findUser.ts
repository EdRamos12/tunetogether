import { MongoClient, ObjectId } from "mongodb";

export interface userInterfaceDB {
  _id: ObjectId;
  userId: string;
  email: string;
  password: string;
}

interface findUserCallbackInterface {(
  err: Error, 
  user: userInterfaceDB | null
): void | null}

export default function findUser(client: MongoClient, dbName: string, email: string, callback: findUserCallbackInterface) {
  const collection = client.db(dbName).collection("user");
  collection.findOne({ email }, callback as any);
}