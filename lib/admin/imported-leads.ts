import mongoose from "mongoose";

import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";

type LeanObjectId = mongoose.Types.ObjectId | string;

export type ImportedLeadContactStatus =
  | "not_contacted"
  | "declined"
  | "invited"
  | "claimed"
  | "completed";

type ImportedLeadUser = {
  _id: LeanObjectId;
  name?: string | null;
  phone?: string | null;
  contactStatus?:
    | "not_contacted"
    | "contacted"
    | "interested"
    | "declined"
    | "unreachable"
    | "invited"
    | "claimed";
  inviteStatus?: "imported" | "invited" | "claimed" | "onboarded" | null;
  onboardingCompleted?: boolean;
  contactedAt?: Date | null;
  lastContactMethod?: "call" | "whatsapp" | "in_person" | null;
  lastContactNotes?: string | null;
  createdAt?: Date | null;
};

type ImportedLeadListing = {
  _id: LeanObjectId;
  landlordId: LeanObjectId;
  title: string;
  area: string;
  status:
    | "pending_review"
    | "published"
    | "warning"
    | "removed"
    | "imported_draft"
    | "awaiting_landlord_claim"
    | "awaiting_landlord_completion";
  completedByLandlord?: boolean | null;
  photos?: string[] | null;
  landmark?: string | null;
  capacity?: number | null;
  importNotes?: string | null;
  pricingDisplayText?: string | null;
  amenities?: string[] | null;
  tenantPreferences?: string[] | null;
  seedConfidence?: "low" | "medium" | "high" | null;
  rawImportedText?: string | null;
};

type ImportedLeadEvent = {
  _id: LeanObjectId;
  landlordId: LeanObjectId;
  type?:
    | "call"
    | "whatsapp"
    | "in_person"
    | "invite_sent"
    | "invite_resent"
    | "declined"
    | "unreachable"
    | "claimed"
    | "whatsapp_invite"
    | null;
  notes?: string | null;
  createdAt?: Date | null;
};

export type ImportedLeadRow = {
  userId: string;
  name: string;
  phone: string;
  contactStatus: NonNullable<ImportedLeadUser["contactStatus"]>;
  inviteStatus: NonNullable<ImportedLeadUser["inviteStatus"]> | "imported";
  onboardingCompleted: boolean;
  listing: {
    id: string;
    title: string;
    area: string;
    status: ImportedLeadListing["status"];
    completedByLandlord: boolean;
    photos: string[];
    landmark: string;
    capacity: number | null;
    importNotes: string;
    pricingDisplayText: string;
    amenities: string[];
    tenantPreferences: string[];
    seedConfidence: ImportedLeadListing["seedConfidence"];
    rawImportedText: string;
  } | null;
  latestEvent: {
    type: NonNullable<ImportedLeadEvent["type"]>;
    notes: string;
    createdAt: string | null;
  } | null;
};

export const IMPORTED_LEAD_FILTERS = new Set<ImportedLeadContactStatus>([
  "not_contacted",
  "declined",
  "invited",
  "claimed",
  "completed",
]);

export function normalizeImportedLeadFilter(
  value?: string | null,
): ImportedLeadContactStatus | null {
  if (!value) {
    return null;
  }

  return IMPORTED_LEAD_FILTERS.has(value as ImportedLeadContactStatus)
    ? (value as ImportedLeadContactStatus)
    : null;
}

export async function getImportedLeadRows(contactStatus?: ImportedLeadContactStatus | null) {
  const userQuery: Record<string, unknown> = {
    role: "landlord",
    source: "pdf_import",
  };

  if (contactStatus === "not_contacted" || contactStatus === "declined") {
    userQuery.contactStatus = contactStatus;
  } else if (contactStatus === "invited") {
    userQuery.inviteStatus = "invited";
  } else if (contactStatus === "claimed") {
    userQuery.inviteStatus = "claimed";
  } else if (contactStatus === "completed") {
    userQuery.onboardingCompleted = true;
  }

  const users = (await User.find(userQuery)
    .sort({ createdAt: -1 })
    .select({
      _id: 1,
      name: 1,
      phone: 1,
      contactStatus: 1,
      inviteStatus: 1,
      onboardingCompleted: 1,
      contactedAt: 1,
      lastContactMethod: 1,
      lastContactNotes: 1,
      createdAt: 1,
    })
    .lean()
    .exec()) as ImportedLeadUser[];

  if (users.length === 0) {
    return [];
  }

  const landlordIds = users.map((user) => user._id);

  const [listings, events] = await Promise.all([
    Listing.find({ landlordId: { $in: landlordIds }, source: "pdf_import" })
      .sort({ createdAt: -1 })
      .select({
        _id: 1,
        landlordId: 1,
        title: 1,
        area: 1,
        status: 1,
        completedByLandlord: 1,
        photos: 1,
        landmark: 1,
        capacity: 1,
        importNotes: 1,
        pricingDisplayText: 1,
        amenities: 1,
        tenantPreferences: 1,
        seedConfidence: 1,
        rawImportedText: 1,
      })
      .lean()
      .exec() as Promise<ImportedLeadListing[]>,
    LandlordOutreachEvent.find({ landlordId: { $in: landlordIds } })
      .sort({ createdAt: -1 })
      .select({
        _id: 1,
        landlordId: 1,
        type: 1,
        notes: 1,
        createdAt: 1,
      })
      .lean()
      .exec() as Promise<ImportedLeadEvent[]>,
  ]);

  const listingByLandlord = new Map<string, ImportedLeadListing>();
  for (const listing of listings) {
    const landlordId = String(listing.landlordId);
    if (!listingByLandlord.has(landlordId)) {
      listingByLandlord.set(landlordId, listing);
    }
  }

  const latestEventByLandlord = new Map<string, ImportedLeadEvent>();
  for (const event of events) {
    const landlordId = String(event.landlordId);
    if (!latestEventByLandlord.has(landlordId)) {
      latestEventByLandlord.set(landlordId, event);
    }
  }

  return users.map((user) => {
    const listing = listingByLandlord.get(String(user._id));
    const latestEvent = latestEventByLandlord.get(String(user._id));

    return {
      userId: String(user._id),
      name: user.name?.trim() || "Imported landlord",
      phone: user.phone?.trim() || "",
      contactStatus: user.contactStatus || "not_contacted",
      inviteStatus: user.inviteStatus || "imported",
      onboardingCompleted: Boolean(user.onboardingCompleted),
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            area: listing.area,
            status: listing.status,
            completedByLandlord: Boolean(listing.completedByLandlord),
            photos: Array.isArray(listing.photos) ? listing.photos : [],
            landmark: listing.landmark || "",
            capacity: typeof listing.capacity === "number" ? listing.capacity : null,
            importNotes: listing.importNotes || "",
            pricingDisplayText: listing.pricingDisplayText || "",
            amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
            tenantPreferences: Array.isArray(listing.tenantPreferences)
              ? listing.tenantPreferences
              : [],
            seedConfidence: listing.seedConfidence || null,
            rawImportedText: listing.rawImportedText || "",
          }
        : null,
      latestEvent:
        latestEvent?.type
          ? {
              type: latestEvent.type,
              notes: latestEvent.notes || "",
              createdAt: latestEvent.createdAt ? latestEvent.createdAt.toISOString() : null,
            }
          : null,
    };
  }) satisfies ImportedLeadRow[];
}
