import { NextRequest, NextResponse } from "next/server";

import { getPublishedListings, parseListingsSearchParams } from "@/lib/listings";

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
