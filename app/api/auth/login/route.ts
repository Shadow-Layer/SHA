import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as LoginBody;

  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  await connectDB();

  const user = await User.findOne({ email }).lean();
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
  if (!isValidPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
