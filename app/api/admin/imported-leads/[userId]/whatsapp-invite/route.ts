import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";
import { buildLandlordClaimUrl, resolveBaseUrl } from "@/lib/admin/invite-helpers";
import { appendClaimLink, buildWhatsAppLink } from "@/lib/whatsapp";

type RouteContext = {
  params: { userId: string };
};

type RequestBody = {
  messageTemplate?: string;
  phoneOverride?: string;
};

const PRE_CLAIM_LISTING_STATUSES = ["imported_draft", "awaiting_landlord_claim"] as const;

const DEFAULT_MESSAGE_TEMPLATE =
  "Hello {landlordName}, this is Student Housing Archive. We imported your rental listing details so students can find verified housing more easily. Please claim your landlord account and complete your listing using the secure link below:\n\n{claimLink}\n\nIf you did not expect this message, you can ignore it.";

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    // body is optional — default to empty
  }

  await connectDB();

  const [user, listing] = await Promise.all([
    User.findOne({ _id: params.userId, source: "pdf_import", role: "landlord" }).exec(),
    Listing.findOne({ landlordId: params.userId, source: "pdf_import" })
      .sort({ createdAt: -1 })
      .exec(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Imported landlord not found" }, { status: 404 });
  }

  if (!listing) {
    return NextResponse.json({ error: "Linked listing not found" }, { status: 404 });
  }

  if (
    user.inviteStatus === "claimed" ||
    user.inviteStatus === "onboarded" ||
    user.onboardingCompleted === true
  ) {
    return NextResponse.json(
      { error: "Landlord has already claimed their account." },
      { status: 409 },
    );
  }

  if (
    !PRE_CLAIM_LISTING_STATUSES.includes(
      listing.status as (typeof PRE_CLAIM_LISTING_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Listing is not in a claimable state." },
      { status: 404 },
    );
  }

  const phone = body.phoneOverride?.trim() || user.phone?.trim() || "";

  // validate phone early before generating token
  const phoneCheck = buildWhatsAppLink(phone, "test");
  if (!phoneCheck) {
    return NextResponse.json(
      { error: "Invalid or missing phone number" },
      { status: 400 },
    );
  }

  const baseUrl = resolveBaseUrl(request);
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Cannot determine base URL. Set NEXTAUTH_URL." },
      { status: 500 },
    );
  }

  // generate fresh token — replaces any existing one
  const rawToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = await bcrypt.hash(rawToken, 10);
  const now = new Date();
  const inviteTokenExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  user.inviteTokenHash = inviteTokenHash;
  user.inviteTokenExpiresAt = inviteTokenExpiresAt;
  user.isInvited = true;
  user.inviteStatus = "invited";
  await user.save();

  if (listing.status === "imported_draft") {
    listing.status = "awaiting_landlord_claim";
    await listing.save();
  }

  const claimUrl = buildLandlordClaimUrl(baseUrl, rawToken);
  const landlordName = user.name?.trim() || "there";

  const template = body.messageTemplate?.trim() || DEFAULT_MESSAGE_TEMPLATE;
  const interpolated = template
    .replace(/\{landlordName\}/g, landlordName)
    .replace(/\{claimLink\}/g, claimUrl);
  const finalMessage = appendClaimLink(interpolated, claimUrl);

  const waResult = buildWhatsAppLink(phone, finalMessage)!;

  // build redacted notes — never store raw token or full claimUrl
  const claimUrlPattern = new RegExp(claimUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const redactedMessage = finalMessage.replace(claimUrlPattern, "[CLAIM_LINK_REDACTED]");
  const notes = `WhatsApp invite link generated · phone: ${waResult.normalizedPhoneE164} · expires: ${inviteTokenExpiresAt.toISOString()} · message: ${redactedMessage}`;

  await LandlordOutreachEvent.create({
    landlordId: user._id,
    listingId: listing._id,
    type: "whatsapp_invite",
    notes,
    createdBy: session.user.id,
    createdAt: now,
  });

  return NextResponse.json({
    ok: true,
    claimUrl,
    whatsappUrl: waResult.whatsappUrl,
    normalizedPhone: waResult.normalizedPhoneE164,
    expiresAt: inviteTokenExpiresAt.toISOString(),
    messagePreview: finalMessage,
  });
}
