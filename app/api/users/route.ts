import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = request.nextUrl.searchParams.get("role");
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Math.min(
    Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") || "10", 10), 1),
    30,
  );

  const query: Record<string, unknown> = {};
  if (
    role === "student" ||
    role === "landlord" ||
    role === "service_provider" ||
    role === "admin"
  ) {
    query.role = role;
  }
  if (q) {
    query.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
  }

  await connectDB();
  const users = await User.find(query).select({ _id: 1, name: 1, email: 1, role: 1 }).limit(limit).lean().exec();

  return NextResponse.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name || null,
      email: user.email || null,
      role: user.role,
    })),
  });
}
