import mongoose from "mongoose";
import { ensureMongooseModelsRegistered } from "@/lib/registerMongooseModels";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in environment variables");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __edu_mongoose_cache__: MongooseCache | undefined;
}

const cached: MongooseCache = (global.__edu_mongoose_cache__ ??= {
  conn: null,
  promise: null,
});

export default async function connectDB() {
  const mongoUri = MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Please define MONGODB_URI in environment variables");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoUri, { bufferCommands: false })
      .then((m) => m)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  ensureMongooseModelsRegistered();
  return cached.conn;
}
