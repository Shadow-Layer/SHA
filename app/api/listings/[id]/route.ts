import { NextRequest, NextResponse } from "next/server";

import { getListingById } from "@/lib/listings";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const listing = await getListingById(params.id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json(listing);
}
