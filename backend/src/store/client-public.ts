import { MongoClient, type MongoClientOptions } from "mongodb";
import { loadEnv } from "../config/env";

let clientPublic: MongoClient | null = null;

export async function getMongoClientPublic(): Promise<MongoClient> {
  if (clientPublic) return clientPublic;
  const env = loadEnv();
  const uri = env.MONGODB_URI_PUBLIC ?? env.MONGODB_URI;
  clientPublic = new MongoClient(uri, {
    maxPoolSize: 5,
  } as MongoClientOptions);
  await clientPublic.connect();
  return clientPublic;
}

const DB_NAME = "content";

export async function getContentDbPublic() {
  const c = await getMongoClientPublic();
  return c.db(DB_NAME);
}
