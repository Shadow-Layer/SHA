import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import Notification from "@/lib/models/Notification";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();

  const listing = await Listing.findById(params.id).exec();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (action === "approve") {
    listing.status = "published";
    listing.publiclyVisible = true;
    listing.verificationLevel = "landlord_confirmed";
    await listing.save();

    await Notification.create({
      userId: listing.landlordId,
      type: "listing_approved",
      message: `Your listing ${listing.title} is now live.`,
      relatedId: String(listing._id),
      relatedType: "listing",
    });

    return NextResponse.json({ id: String(listing._id), status: listing.status });
  }

  listing.status = "removed";
  listing.publiclyVisible = false;
  await listing.save();

  await Notification.create({
    userId: listing.landlordId,
    type: "listing_rejected",
    message: note
      ? `Your listing ${listing.title} was removed by admin. Note: ${note}`
      : `Your listing ${listing.title} was removed by admin.`,
    relatedId: String(listing._id),
    relatedType: "listing",
  });

  return NextResponse.json({ id: String(listing._id), status: listing.status });
}
