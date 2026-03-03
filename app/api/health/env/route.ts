import { NextResponse } from "next/server";

function isTruthy(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET(request: Request) {
  const key = request.headers.get("x-debug-key");
  const expected = process.env.SEED_SECRET;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      hasMongodbUri: isTruthy(process.env.MONGODB_URI),
      hasNextAuthSecret: isTruthy(process.env.NEXTAUTH_SECRET),
      hasNextAuthUrl: isTruthy(process.env.NEXTAUTH_URL),
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    },
    { status: 200 },
  );
}
