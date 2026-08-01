import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { buildPasswordResetEmail, sendEmail } from "@/lib/delivery";
import User from "@/lib/models/User";

type ForgotPasswordBody = {
  email?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ForgotPasswordBody;
  const email = body.email?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ ok: true });
  }

  await connectDB();

  const user = await User.findOne({ email }).exec();
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const expiresAt =
    user.passwordResetExpiresAt instanceof Date ? user.passwordResetExpiresAt : null;

  if (
    expiresAt &&
    expiresAt.getTime() > Date.now() &&
    Date.now() - expiresAt.getTime() + 3_600_000 < 60_000
  ) {
    return NextResponse.json({ ok: true });
  }

  const plainToken = crypto.randomBytes(32).toString("hex");
  const passwordResetTokenHash = await bcrypt.hash(plainToken, 12);
  const passwordResetExpiresAt = new Date(Date.now() + 3_600_000);

  user.passwordResetTokenHash = passwordResetTokenHash;
  user.passwordResetExpiresAt = passwordResetExpiresAt;
  await user.save();

  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  if (baseUrl) {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${plainToken}`;
    await sendEmail({
      to: user.email,
      ...buildPasswordResetEmail({ email: user.email, resetUrl }),
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[SHA dev] password reset token:", plainToken);
  }

  return NextResponse.json({ ok: true });
}
