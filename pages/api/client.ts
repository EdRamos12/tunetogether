import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any);

export default client;