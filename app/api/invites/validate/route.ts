import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";

const CLAIMABLE_LISTING_STATUSES = ["awaiting_landlord_claim", "imported_draft"] as const;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const now = new Date();

  if (!token) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  await connectDB();

  const candidates = await User.find({
    inviteStatus: "invited",
    inviteTokenHash: { $exists: true, $ne: null },
  })
    .select({
      _id: 1,
      name: 1,
      phone: 1,
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
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  if (
    !(user.inviteTokenExpiresAt instanceof Date) ||
    user.inviteTokenExpiresAt.getTime() <= now.getTime()
  ) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  const listing = await Listing.findOne({
    landlordId: user._id,
    status: { $in: CLAIMABLE_LISTING_STATUSES },
  })
    .select({ _id: 1, title: 1, area: 1 })
    .lean()
    .exec();

  if (!listing) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  return NextResponse.json({
    valid: true,
    landlordName: user.name ?? "",
    landlordPhone: user.phone ?? "",
    listingTitle: listing.title,
    listingArea: listing.area,
  });
}
