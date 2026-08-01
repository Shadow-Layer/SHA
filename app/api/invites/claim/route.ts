import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import Listing from "@/lib/models/Listing";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";

const CLAIMABLE_LISTING_STATUSES = ["awaiting_landlord_claim", "imported_draft"] as const;

type ClaimBody = {
  token?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
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
  const phone = body.phone?.trim();
  const password = body.password;
  const confirmPassword = body.confirmPassword;
  const termsAccepted = body.termsAccepted;

  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  if (!password || password.length < 8) {
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

  if (termsAccepted !== true) {
    return NextResponse.json(
      { error: "You must accept the Terms of Use to continue." },
      { status: 400 },
    );
  }

  const now = new Date();

  await connectDB();

  const candidates = await User.find({
    inviteStatus: "invited",
    inviteTokenHash: { $exists: true, $ne: null },
    inviteTokenExpiresAt: { $gt: now },
  })
    .select({
      _id: 1,
      email: 1,
      inviteTokenHash: 1,
      inviteStatus: 1,
      inviteTokenExpiresAt: 1,
    })
    .lean()
    .exec();

  const user = (
    await Promise.all(
      candidates.map(async (candidate) =>
        candidate.inviteTokenHash &&
        (await bcrypt.compare(token, candidate.inviteTokenHash))
          ? candidate
          : null,
      ),
    )
  ).find((candidate) => candidate !== null);

  if (!user || user.inviteStatus !== "invited") {
    return NextResponse.json(
      { error: "This invite link is invalid. Please contact the SHA team to request a new link." },
      { status: 404 },
    );
  }

  if (
    !(user.inviteTokenExpiresAt instanceof Date) ||
    user.inviteTokenExpiresAt.getTime() <= now.getTime()
  ) {
    return NextResponse.json(
      { error: "This invite link has expired. Please contact the SHA team to request a new link." },
      { status: 410 },
    );
  }

  const listing = await Listing.findOne({
    landlordId: user._id,
    status: { $in: CLAIMABLE_LISTING_STATUSES },
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (!listing) {
    return NextResponse.json(
      { error: "This invite link is invalid. Please contact the SHA team to request a new link." },
      { status: 404 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const userUpdateResult = await User.updateOne(
    {
      _id: user._id,
      inviteTokenHash: user.inviteTokenHash,
      inviteStatus: "invited",
    },
    {
      $set: {
        hashedPassword,
        phone,
        passwordSetAt: now,
        inviteStatus: "claimed",
        inviteTokenHash: null,
        inviteTokenExpiresAt: null,
        consentGiven: true,
        consentAt: now,
      },
    },
  ).exec();

  if (userUpdateResult.matchedCount === 0) {
    return NextResponse.json(
      { error: "This invite link is invalid or has expired." },
      { status: 409 },
    );
  }

  await Listing.updateOne(
    { _id: listing._id },
    { $set: { status: "awaiting_landlord_completion" } },
  ).exec();

  await LandlordOutreachEvent.create({
    landlordId: user._id,
    listingId: listing._id,
    type: "claimed",
    notes: "Landlord claimed account via invite link",
    createdAt: now,
  });

  try {
    void Promise.all([
      Notification.create({
        userId: user._id,
        type: "listing_completion_needed",
        message: "Your account is active. Complete your listing details to go live on SHA.",
        relatedId: String(listing._id),
        relatedType: "listing",
      }),
      User.find({ role: "admin" })
        .select("_id")
        .lean()
        .exec()
        .then((admins) => {
          if (admins.length === 0) {
            return;
          }

          return Notification.insertMany(
            admins.map((admin) => ({
              userId: admin._id,
              type: "account_claimed",
              message:
                "A landlord has claimed their account and is ready to complete their listing.",
              relatedId: String(listing._id),
              relatedType: "listing",
            })),
          );
        }),
    ]).catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true, email: user.email });
}
