import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key =
    request.headers.get("x-seed-secret") ??
    request.headers.get("x-debug-key") ??
    url.searchParams.get("key");
  const expected = process.env.SEED_SECRET;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim().length === 0) {
    return NextResponse.json(
      {
        ok: false,
        status: "env-missing",
        details: "MONGODB_URI is not set",
      },
      { status: 500 },
    );
  }

  try {
    await connectDB();
    const admin = mongoose.connection.db?.admin();
    const pingResult = admin ? await admin.ping() : null;

    return NextResponse.json(
      {
        ok: true,
        status: "connected",
        readyState: mongoose.connection.readyState,
        ping: pingResult,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "connect-failed",
        readyState: mongoose.connection.readyState,
        error: serializeError(error),
      },
      { status: 500 },
    );
  }
}
