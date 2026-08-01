import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Application from "@/lib/models/Application";
import Listing from "@/lib/models/Listing";
import Notification from "@/lib/models/Notification";

type RouteContext = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "student") {
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

  const moveInDate =
    typeof body.moveInDate === "string" && body.moveInDate
      ? new Date(body.moveInDate)
      : undefined;
  const occupancyPreference =
    typeof body.occupancyPreference === "string" ? body.occupancyPreference.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (moveInDate && Number.isNaN(moveInDate.getTime())) {
    return NextResponse.json({ error: "Invalid move-in date" }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.findById(params.id).lean().exec();
  if (!listing || (listing.status !== "published" && listing.status !== "warning")) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    const application = await Application.create({
      listingId: params.id,
      studentId: session.user.id,
      landlordId: listing.landlordId,
      moveInDate,
      occupancyPreference: occupancyPreference || undefined,
      message: message || undefined,
      status: "pending",
    });

    await Notification.create({
      userId: listing.landlordId,
      type: "new_application",
      message: `New application for ${listing.title} from ${session.user.name || session.user.email || "Student"}`,
      relatedId: params.id,
      relatedType: "listing",
    });

    return NextResponse.json(
      { id: String(application._id), status: application.status },
      { status: 201 },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: number }).code) === 11000
    ) {
      return NextResponse.json({ error: "You already applied to this listing." }, { status: 409 });
    }
    throw error;
  }
}
