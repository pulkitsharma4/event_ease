// src/lib/db.ts
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// eslint-disable-next-line no-var
declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const globalCache = globalThis as unknown as { __mongooseCache?: MongooseCache };
const cache: MongooseCache = globalCache.__mongooseCache ?? { conn: null, promise: null };
globalCache.__mongooseCache = cache;

export default async function dbConnect() {
  if (cache.conn) return cache.conn;

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => m);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
