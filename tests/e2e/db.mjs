import { MongoClient, ObjectId } from "mongodb";

let clientPromise;

function getClient() {
  if (!clientPromise) {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required for E2E database helpers");
    }

    clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }

  return clientPromise;
}

function getDbName() {
  const parsed = new URL(process.env.MONGODB_URI);
  const dbName = parsed.pathname.replace(/^\//, "");

  if (!dbName) {
    throw new Error("MONGODB_URI must include a database name for E2E database helpers");
  }

  return dbName;
}

export async function publishListing(listingId) {
  if (!ObjectId.isValid(listingId)) {
    throw new Error(`Invalid listing id for publishListing: ${listingId}`);
  }

  const client = await getClient();
  const db = client.db(getDbName());
  const result = await db.collection("listings").findOneAndUpdate(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        status: "published",
        verificationLevel: "landlord_confirmed",
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!result) {
    throw new Error(`Listing not found for publishListing: ${listingId}`);
  }

  if ("value" in result) {
    if (result.value === null) {
      throw new Error(`Listing not found for publishListing: ${listingId}`);
    }

    if (result.value !== undefined && typeof result.value === "object") {
      return result.value;
    }
  }

  return result;
}
