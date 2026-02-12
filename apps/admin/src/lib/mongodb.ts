import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

const MONGODB_URI: string = process.env.MONGODB_URI;

/**
 * Mongoose connection singleton for serverless environments.
 * mongoose.connect() is a no-op when already connected (Mongoose 9.x),
 * so calling this multiple times is safe without manual caching.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  return mongoose.connect(MONGODB_URI);
}
