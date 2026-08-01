import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

type ResetPasswordBody = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ResetPasswordBody;
  const token = body.token?.trim();
  const password = body.password;
  const confirmPassword = body.confirmPassword;

  if (!token || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Token, password, and confirm password are required." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Password and confirm password do not match." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  await connectDB();

  const candidates = await User.find({
    passwordResetExpiresAt: { $gt: new Date() },
  }).exec();

  let matchedUser: (typeof candidates)[number] | null = null;

  for (const candidate of candidates) {
    if (!candidate.passwordResetTokenHash) {
      continue;
    }

    const isMatch = await bcrypt.compare(token, candidate.passwordResetTokenHash);
    if (isMatch) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    return NextResponse.json(
      { error: "Invalid or expired reset link." },
      { status: 400 },
    );
  }

  matchedUser.hashedPassword = await bcrypt.hash(password, 12);
  matchedUser.passwordResetTokenHash = undefined;
  matchedUser.passwordResetExpiresAt = undefined;
  await matchedUser.save();

  return NextResponse.json({ ok: true });
}
