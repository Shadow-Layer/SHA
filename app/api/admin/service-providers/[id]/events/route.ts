import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import ServiceProviderOutreachEvent from "@/lib/models/ServiceProviderOutreachEvent";
import User from "@/lib/models/User";

type RouteContext = {
  params: { id: string };
};

function getTransitionLabel(type: unknown) {
  return type === "contacted" ||
    type === "interested" ||
    type === "declined" ||
    type === "unreachable" ||
    type === "claimed"
    ? type
    : "";
}

export async function GET(_: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  await connectDB();

  const provider = await ServiceProvider.findById(params.id).select({ _id: 1 }).lean().exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const events = await ServiceProviderOutreachEvent.find({ providerId: params.id })
    .sort({ createdAt: -1 })
    .select({ _id: 1, type: 1, notes: 1, createdAt: 1, createdBy: 1 })
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
      type: typeof event.type === "string" ? event.type : "",
      transition: getTransitionLabel(event.type),
      notes: typeof event.notes === "string" ? event.notes : "",
      createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : null,
      createdBy: event.createdBy ? String(event.createdBy) : null,
      createdByName: event.createdBy ? creatorMap.get(String(event.createdBy)) || "Admin" : null,
    })),
  });
}
