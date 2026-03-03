import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

type RegisterBody = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  role?: "student" | "landlord";
};

function isVerifiedStudentEmail(email: string): boolean {
  const normalized = email.toLowerCase();

  return normalized.endsWith(".ac.zw") || normalized.endsWith("@africau.edu");
}

function toUsernameBase(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const normalized = local.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return normalized.length > 0 ? normalized : "user";
}

async function buildUniqueUsername(email: string): Promise<string> {
  const base = toUsernameBase(email);
  let candidate = base;
  let counter = 1;

  while (await User.exists({ username: candidate })) {
    counter += 1;
    candidate = `${base}${counter}`;
  }

  return candidate;
}

export async function POST(req: Request) {
  const body = (await req.json()) as RegisterBody;

  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const phone = body.phone?.trim();
  const password = body.password;
  const confirmPassword = body.confirmPassword;
  const role = body.role;

  if (!name || !email || !phone || !password || !confirmPassword || !role) {
    return NextResponse.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  if (!["student", "landlord"].includes(role)) {
    return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Password and confirm password do not match." },
      { status: 400 },
    );
  }

  await connectDB();

  const existingUser = await User.findOne({ email }).lean();
  
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const username = await buildUniqueUsername(email);

  try {
    await User.create({
      name,
      username,
      email,
      phone,
      hashedPassword,
      role,
      isVerifiedStudent: isVerifiedStudentEmail(email),
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
