import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";

type RouteContext = {
  params: { id: string };
};

const ALLOWED_OCCUPANCY_TYPES = new Set([
  "per_room",
  "per_head_double",
  "per_head_triple_plus",
  "full_house",
  "custom",
]);

type NormalizedOccupancyOption = {
  type: string;
  rentAmount: number | null;
  description?: string;
};

function normalizeOccupancyOptions(value: unknown): NormalizedOccupancyOption[] {
  if (!Array.isArray(value)) {
    throw new Error("Occupancy options must be an array");
  }

  return value.flatMap((option) => {
    if (typeof option !== "object" || option === null) {
      throw new Error("Each occupancy option must be an object");
    }

    const occupancyOption = option as Record<string, unknown>;
    const type =
      typeof occupancyOption.type === "string"
        ? occupancyOption.type
        : typeof occupancyOption.occupancyType === "string"
          ? occupancyOption.occupancyType
          : null;

    if (!type) {
      throw new Error("Each occupancy option must include a type");
    }

    if (!ALLOWED_OCCUPANCY_TYPES.has(type)) {
      throw new Error(
        `Invalid occupancy type: ${type}. Allowed values are per_room, per_head_double, per_head_triple_plus, full_house, custom.`,
      );
    }

    const rawRent = occupancyOption.rentAmount ?? occupancyOption.rent;
    const rentAmount = typeof rawRent === "number" ? rawRent : Number(rawRent);

    return [
      {
        type,
        rentAmount: Number.isFinite(rentAmount) ? rentAmount : null,
        description:
          typeof occupancyOption.description === "string" ? occupancyOption.description : undefined,
      },
    ];
  });
}

function normalizeRegulations(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (payload.consentConfirmed !== true) {
    return NextResponse.json({ error: "Consent confirmation is required" }, { status: 400 });
  }
  if (typeof payload.title !== "string" || payload.title.trim() === "") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof payload.area !== "string" || payload.area.trim() === "") {
    return NextResponse.json({ error: "Area is required" }, { status: 400 });
  }
  if (!Array.isArray(payload.amenities)) {
    return NextResponse.json({ error: "Amenities must be an array" }, { status: 400 });
  }
  if (!Array.isArray(payload.tenantPreferences)) {
    return NextResponse.json({ error: "Tenant preferences must be an array" }, { status: 400 });
  }
  if (!Array.isArray(payload.photos)) {
    return NextResponse.json({ error: "Photos must be an array" }, { status: 400 });
  }
  if (!Array.isArray(payload.occupancyOptions)) {
    return NextResponse.json({ error: "Occupancy options must be an array" }, { status: 400 });
  }
  if (
    payload.regulations !== undefined &&
    (typeof payload.regulations !== "object" ||
      payload.regulations === null ||
      Array.isArray(payload.regulations))
  ) {
    return NextResponse.json({ error: "Regulations must be an object" }, { status: 400 });
  }

  await connectDB();

  const listing = await Listing.findById(params.id).exec();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (String(listing.landlordId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.status !== "awaiting_landlord_completion") {
    return NextResponse.json(
      { error: "Listing is not ready for landlord completion" },
      { status: 400 },
    );
  }

  const title = payload.title.trim();
  const area = payload.area.trim();
  const landmark = typeof payload.landmark === "string" ? payload.landmark.trim() : "";
  let occupancyOptions: NormalizedOccupancyOption[];
  try {
    occupancyOptions = normalizeOccupancyOptions(payload.occupancyOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid occupancy options";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const amenities = payload.amenities.filter((value): value is string => typeof value === "string");
  const regulations = normalizeRegulations(payload.regulations);
  const tenantPreferences = payload.tenantPreferences.filter(
    (value): value is string => typeof value === "string",
  );
  const photos = payload.photos.filter((value): value is string => typeof value === "string");
  const now = new Date();

  listing.title = title;
  listing.area = area;
  listing.landmark = landmark;
  listing.occupancyOptions = occupancyOptions;
  listing.amenities = amenities;
  listing.regulations = regulations;
  listing.tenantPreferences = tenantPreferences;
  listing.photos = photos;
  listing.status = "pending_review";
  listing.completedByLandlord = true;
  listing.completedAt = now;
  listing.landlordConsentConfirmed = true;
  listing.landlordConsentMethod = "form";
  listing.landlordConsentAt = now;
  listing.publiclyVisible = false;
  if (photos.length === 0) {
    listing.seedConfidence = "low";
  }

  await listing.save();

  await User.updateOne(
    { _id: session.user.id },
    {
      $set: {
        onboardingCompleted: true,
        inviteStatus: "onboarded",
      },
    },
  ).exec();

  try {
    void User.find({ role: "admin" })
      .select("_id")
      .lean()
      .exec()
      .then((admins) => {
        if (admins.length === 0) {
          return;
        }

        return Notification.insertMany(
          admins.map((admin) => ({
            userId: admin._id,
            type: "listing_ready_for_review",
            message: `A landlord has submitted their listing for review: ${listing.title}`,
            relatedId: String(listing._id),
            relatedType: "listing",
          })),
        );
      })
      .catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true, listingId: String(listing._id) });
}
