import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import Report from "@/lib/models/Report";
import VerificationEvent from "@/lib/models/VerificationEvent";

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

  const type = body.type;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (type !== "stayed" && type !== "seen" && type !== "suspicious") {
    return NextResponse.json({ error: "Invalid verification type" }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.findById(params.id).lean().exec();
  if (!listing || (listing.status !== "published" && listing.status !== "warning")) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    await VerificationEvent.create({
      listingId: params.id,
      studentId: session.user.id,
      type,
      note: note || undefined,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: number }).code) === 11000
    ) {
      return NextResponse.json({ error: "You already verified this listing." }, { status: 409 });
    }
    throw error;
  }

  const updates: Record<string, unknown> = {};
  if (type === "suspicious") {
    updates.$inc = { suspiciousCount: 1 };
  } else {
    updates.$inc = { confirmationCount: 1 };
  }

  const updatedListing = await Listing.findByIdAndUpdate(params.id, updates, {
    new: true,
  })
    .lean()
    .exec();

  if (!updatedListing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const nextStatus =
    updatedListing.suspiciousCount >= 2 ? "warning" : updatedListing.status;
  const nextVerificationLevel =
    updatedListing.confirmationCount >= 3
      ? "student_verified"
      : updatedListing.verificationLevel;

  if (
    nextStatus !== updatedListing.status ||
    nextVerificationLevel !== updatedListing.verificationLevel
  ) {
    await Listing.findByIdAndUpdate(params.id, {
      status: nextStatus,
      verificationLevel: nextVerificationLevel,
    }).exec();
  }

  if (nextStatus === "warning" && updatedListing.status !== "warning") {
    await Report.create({
      targetType: "listing",
      targetId: params.id,
      reporterId: session.user.id,
      reason: "Listing reached suspicious verification threshold",
      status: "pending",
    });
  }

  return NextResponse.json({
    status: nextStatus,
    verificationLevel: nextVerificationLevel,
    confirmationCount: updatedListing.confirmationCount,
    suspiciousCount: updatedListing.suspiciousCount,
  });
}
