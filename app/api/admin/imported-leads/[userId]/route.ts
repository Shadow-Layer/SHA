import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";

type RouteContext = {
  params: { userId: string };
};

type ContactStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "declined"
  | "unreachable"
  | "invited"
  | "claimed";
type ContactMethod = "call" | "whatsapp" | "in_person";

type PatchBody = {
  contactStatus?: ContactStatus;
  notes?: string;
  contactMethod?: ContactMethod;
  archiveListing?: boolean;
};

const CONTACT_STATUSES = new Set<ContactStatus>([
  "not_contacted",
  "contacted",
  "interested",
  "declined",
  "unreachable",
  "invited",
  "claimed",
]);

const CONTACT_METHODS = new Set<ContactMethod>(["call", "whatsapp", "in_person"]);

function getOutreachEventType(
  contactStatus: ContactStatus,
  contactMethod?: ContactMethod,
) {
  if (contactStatus === "declined" || contactStatus === "unreachable") {
    return contactStatus;
  }

  return contactMethod ?? null;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contactStatus = body.contactStatus;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const contactMethod = body.contactMethod;
  const archiveListing = body.archiveListing === true;

  if (!contactStatus || !CONTACT_STATUSES.has(contactStatus)) {
    return NextResponse.json({ error: "Invalid contactStatus" }, { status: 400 });
  }

  if (contactMethod && !CONTACT_METHODS.has(contactMethod)) {
    return NextResponse.json({ error: "Invalid contactMethod" }, { status: 400 });
  }

  if (
    (contactStatus === "contacted" || contactStatus === "interested" || contactStatus === "invited") &&
    !contactMethod
  ) {
    return NextResponse.json(
      { error: "contactMethod is required for this contact status" },
      { status: 400 },
    );
  }

  await connectDB();

  const [user, listing] = await Promise.all([
    User.findOne({ _id: params.userId, source: "pdf_import", role: "landlord" }).exec(),
    Listing.findOne({ landlordId: params.userId, source: "pdf_import" }).exec(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Imported landlord not found" }, { status: 404 });
  }

  const now = new Date();
  user.contactStatus = contactStatus;
  user.contactedAt = now;
  user.lastContactNotes = notes;

  if (contactMethod) {
    user.lastContactMethod = contactMethod;
  }

  await user.save();

  if (archiveListing && listing) {
    listing.status = "removed";
    listing.publiclyVisible = false;
    await listing.save();
  }

  const eventType = getOutreachEventType(contactStatus, contactMethod);
  if (eventType) {
    await LandlordOutreachEvent.create({
      landlordId: user._id,
      listingId: listing?._id,
      type: eventType,
      notes,
      createdBy: session.user.id,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
