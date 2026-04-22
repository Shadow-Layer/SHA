import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";

const ALLOWED_STATUSES = new Set([
  "pending_review",
  "published",
  "warning",
  "removed",
  "imported_draft",
  "awaiting_landlord_claim",
  "awaiting_landlord_completion",
]);

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const query: Record<string, string> = { landlordId: session.user.id };

  if (statusParam) {
    if (!ALLOWED_STATUSES.has(statusParam)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    query.status = statusParam;
  }

  await connectDB();

  const listings = await Listing.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean()
    .exec();

  return NextResponse.json({
    listings: listings.map((listing) => ({
      id: String(listing._id),
      title: listing.title,
      area: listing.area,
      landmark: typeof listing.landmark === "string" ? listing.landmark : "",
      occupancyOptions: Array.isArray(listing.occupancyOptions) ? listing.occupancyOptions : [],
      amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
      regulations:
        listing.regulations && typeof listing.regulations === "object" ? listing.regulations : {},
      tenantPreferences: Array.isArray(listing.tenantPreferences)
        ? listing.tenantPreferences
        : [],
      photos: Array.isArray(listing.photos) ? listing.photos : [],
      pricingDisplayText:
        typeof listing.pricingDisplayText === "string" ? listing.pricingDisplayText : "",
      importNotes: typeof listing.importNotes === "string" ? listing.importNotes : "",
      status: listing.status,
      source: listing.source,
      completedByLandlord: Boolean(listing.completedByLandlord),
      publiclyVisible: Boolean(listing.publiclyVisible),
      updatedAt:
        listing.updatedAt instanceof Date
          ? listing.updatedAt.toISOString()
          : new Date().toISOString(),
    })),
  });
}
