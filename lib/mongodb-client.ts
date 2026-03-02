import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const options = {};

let clientPromise: Promise<MongoClient>;

if (!uri) {
  console.warn("[env] mongodb-client: MONGODB_URI is not defined");
  clientPromise = Promise.reject(new Error("Missing MONGODB_URI environment variable"));
  // Avoid unhandled rejection if auth adapter is disabled and this promise is never awaited.
  void clientPromise.catch(() => undefined);
} else {
  // Show that URI exists without printing sensitive credentials
  console.log(
    "[env] mongodb-client: MONGODB_URI provided (redacted):",
    uri.replace(/^(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, "$1<user>:<pass>@")
  );
  let client: MongoClient;
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export default clientPromise;
