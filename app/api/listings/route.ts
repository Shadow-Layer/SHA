import { NextRequest, NextResponse } from "next/server";

import { getPublishedListings, parseListingsSearchParams } from "@/lib/listings";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/lib/models/Listing";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const { filters, options } = parseListingsSearchParams({
    area: searchParams.get("area") ?? undefined,
    minRent: searchParams.get("minRent") ?? undefined,
    maxRent: searchParams.get("maxRent") ?? undefined,
    occupancyType: searchParams.get("occupancyType") ?? undefined,
    amenities: searchParams.getAll("amenities"),
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  const result = await getPublishedListings(filters, options);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof body.area !== "string" || body.area.trim() === "") {
    return NextResponse.json({ error: "Area is required" }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.create({
    landlordId: session.user.id,
    title: body.title,
    area: body.area,
    landmark: body.landmark || undefined,
    occupancyOptions: body.occupancyOptions || [],
    amenities: body.amenities || [],
    regulations: body.regulations || {},
    tenantPreferences: body.tenantPreferences || [],
    photos: body.photos || [],
    status: "pending_review",
    verificationLevel: "landlord_confirmed",
  });

  return NextResponse.json({ id: String(listing._id), status: listing.status }, { status: 201 });
}
