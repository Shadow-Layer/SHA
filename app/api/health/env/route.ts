import { NextResponse } from "next/server";

const TRACKED_VARS = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "SEED_SECRET",
  "MEGA_EMAIL",
  "MEGA_PASSWORD",
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("x-debug-key");
  const expected = process.env.SEED_SECRET;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = Object.fromEntries(
    TRACKED_VARS.map((variable) => [
      variable,
      process.env[variable] ? "set" : "missing",
    ]),
  );

  return NextResponse.json({ ok: true, vars: status }, { status: 200 });
}
