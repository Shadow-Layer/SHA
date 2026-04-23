import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import ServiceProviderOutreachEvent from "@/lib/models/ServiceProviderOutreachEvent";
import User from "@/lib/models/User";
import { findServiceProviderInviteByToken } from "@/lib/service-provider-invites";

type ClaimBody = {
  token?: string;
  email?: string;
  phone?: string;
  password?: string;
  termsAccepted?: boolean;
};

export async function POST(request: Request) {
  let body: ClaimBody;

  try {
    body = (await request.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const password = body.password;
  const termsAccepted = body.termsAccepted;

  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (termsAccepted !== true) {
    return NextResponse.json({ error: "Terms acceptance is required." }, { status: 400 });
  }

  await connectDB();

  const inviteLookup = await findServiceProviderInviteByToken(token);
  if (!inviteLookup.valid) {
    return NextResponse.json(
      { error: "This link has expired. Contact SHA to request a new one." },
      { status: 400 },
    );
  }

  const existingUser = await User.findOne({ email }).select({ _id: 1 }).lean().exec();
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  const createdUser = await User.create({
    name: inviteLookup.provider.businessName,
    email,
    phone,
    hashedPassword,
    passwordSetAt: now,
    role: "service_provider",
    source: "pdf_import",
    onboardingCompleted: false,
    isInvited: true,
    inviteStatus: "claimed",
    consentGiven: true,
    consentAt: now,
  });

  const providerUpdateResult = await ServiceProvider.updateOne(
    {
      _id: inviteLookup.provider.id,
      status: "unclaimed",
      userId: null,
      inviteTokenHash: inviteLookup.provider.inviteTokenHash,
      inviteTokenExpiresAt: { $gt: now },
    },
    {
      $set: {
        userId: createdUser._id,
        email,
        phone,
        status: "pending_review",
        contactStatus: "claimed",
        contactedAt: now,
      },
      $unset: {
        inviteTokenHash: 1,
        inviteTokenExpiresAt: 1,
      },
    },
  ).exec();

  if (providerUpdateResult.matchedCount === 0) {
    await User.deleteOne({ _id: createdUser._id }).exec();

    return NextResponse.json(
      { error: "This link has already been used or has expired." },
      { status: 400 },
    );
  }

  await ServiceProviderOutreachEvent.create({
    providerId: inviteLookup.provider.id,
    type: "claimed",
    notes: "Provider claimed account via invite link",
    createdAt: now,
  });

  return NextResponse.json({ ok: true, email });
}
