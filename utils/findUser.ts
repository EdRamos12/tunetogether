import { MongoClient, ObjectId } from "mongodb";

export interface userInterfaceDB {
  _id: ObjectId;
  userId: string;
  email: string;
  password: string;
  username: string;
}

export default async function findUser(client: MongoClient, dbName: string, email: string) {
  const collection = client.db(dbName).collection("user");
  return await collection.findOne({ email });
}