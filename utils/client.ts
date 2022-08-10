import { MongoClient, MongoClientOptions } from "mongodb";
require('dotenv').config(); // have to do this now for some weird reason, or else it won't initialize, but ok i guess

// setups client so application can use it freely, might change to mongoose
const client = new MongoClient(process.env.URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as MongoClientOptions);

export default client;