import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import User from "@/lib/models/User";

type RouteContext = {
  params: { userId: string };
};

export async function GET(_: Request, { params }: RouteContext) {
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

  await connectDB();

  const importedLandlord = await User.findOne({
    _id: params.userId,
    role: "landlord",
    source: "pdf_import",
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (!importedLandlord) {
    return NextResponse.json({ error: "Imported landlord not found" }, { status: 404 });
  }

  const events = await LandlordOutreachEvent.find({ landlordId: params.userId })
    .sort({ createdAt: 1 })
    .select({
      _id: 1,
      type: 1,
      notes: 1,
      createdAt: 1,
      createdBy: 1,
      listingId: 1,
    })
    .lean()
    .exec();

  const creatorIds = Array.from(
    new Set(events.flatMap((event) => (event.createdBy ? [String(event.createdBy)] : []))),
  );

  const creators =
    creatorIds.length > 0
      ? await User.find({ _id: { $in: creatorIds } })
          .select({ _id: 1, name: 1, email: 1 })
          .lean()
          .exec()
      : [];

  const creatorMap = new Map(
    creators.map((creator) => [
      String(creator._id),
      creator.name?.trim() || creator.email || "Admin",
    ]),
  );

  return NextResponse.json({
    events: events.map((event) => ({
      id: String(event._id),
      type: event.type ?? "",
      notes: event.notes ?? "",
      createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : null,
      createdBy: event.createdBy ? String(event.createdBy) : null,
      createdByName: event.createdBy ? creatorMap.get(String(event.createdBy)) || "Admin" : null,
      listingId: event.listingId ? String(event.listingId) : null,
    })),
  });
}
