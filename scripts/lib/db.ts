import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

export async function connectDB(): Promise<typeof mongoose> {
  console.log("Connecting to MongoDB...");
  const conn = await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  return conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}
