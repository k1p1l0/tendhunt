import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

let client: MongoClient | null = null;

export async function getDb(mongoUri: string): Promise<Db> {
  if (!client) {
    const opts = {
      maxPoolSize: 1,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    } as MongoClientOptions;
    client = new MongoClient(mongoUri, opts);
    try {
      await client.connect();
    } catch (err) {
      client = null;
      throw err;
    }
  }
  return client.db("tendhunt");
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
