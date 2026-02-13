import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

let client: MongoClient | null = null;

export async function getDb(mongoUri: string): Promise<Db> {
  if (!client) {
    // Cast needed: @cloudflare/workers-types declares a global TLSSocket
    // that conflicts with Node.js tls types used by MongoClientOptions
    const opts = {
      maxPoolSize: 1,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 30000,
    } as MongoClientOptions;
    client = new MongoClient(mongoUri, opts);
  }
  await client.connect();
  return client.db("tendhunt");
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
