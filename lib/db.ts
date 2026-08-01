import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global._mongooseConnection ?? { conn: null, promise: null };
global._mongooseConnection = cached;

// Log a few keys from process.env to help diagnose missing values during startup.
// Only print names, not secrets. This runs as soon as the module is loaded.
const loadedEnvKeys = Object.keys(process.env).filter((k) =>
  ["MONGODB_URI", "NODE_ENV"].includes(k) || k.startsWith("NEXT_")
);
console.log("[env] loaded environment variables:", loadedEnvKeys);

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI!, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  console.log("MongoDB connected");

  return cached.conn;
}
