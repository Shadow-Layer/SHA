import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";

const ALLOWED_STATUSES = new Set(["pending_review", "published", "warning", "removed"]);

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status") || "pending_review";
  const status = ALLOWED_STATUSES.has(statusParam) ? statusParam : "pending_review";

  await connectDB();

  const listings = await Listing.find({ status })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  const landlordIds = Array.from(new Set(listings.map((listing) => String(listing.landlordId))));
  const landlords = await User.find({ _id: { $in: landlordIds } })
    .select({ _id: 1, name: 1, email: 1 })
    .lean()
    .exec();
  const landlordMap = new Map(landlords.map((landlord) => [String(landlord._id), landlord]));

  return NextResponse.json({
    listings: listings.map((listing) => {
      const landlord = landlordMap.get(String(listing.landlordId));
      return {
        id: String(listing._id),
        title: listing.title,
        area: listing.area,
        status: listing.status,
        landlordName: landlord?.name || landlord?.email || "Landlord",
        submittedAt:
          listing.completedAt instanceof Date
            ? listing.completedAt.toISOString()
            : listing.createdAt instanceof Date
              ? listing.createdAt.toISOString()
              : new Date().toISOString(),
        source:
          listing.source === "pdf_import" ||
          listing.source === "landlord_created" ||
          listing.source === "admin_created"
            ? listing.source
            : "landlord_created",
        photoCount: Array.isArray(listing.photos) ? listing.photos.length : 0,
        landlordConsentConfirmed: Boolean(listing.landlordConsentConfirmed),
      };
    }),
  });
}
