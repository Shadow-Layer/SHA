import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";

type ListingSearchParams = Record<string, string | string[] | undefined>;

export type ListingFilters = {
  area?: string;
  minRent?: number;
  maxRent?: number;
  occupancyType?: string;
  amenities?: string[];
};

export type ListingQueryOptions = {
  page?: number;
  limit?: number;
};

export type ListingCardData = {
  id: string;
  title: string;
  area: string;
  occupancyOptions: {
    occupancyType: string;
    rent: number | null;
  }[];
  amenities: string[];
  photoUrl: string | null;
  verificationLevel: "landlord_confirmed" | "student_verified";
  minRent: number | null;
  starRating: number;
  reviewCount: number;
};

export type ListingsResult = {
  listings: ListingCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ListingOccupancyOption = {
  type: string;
  rentAmount: number | null;
  description: string | null;
};

export type ListingRegulations = {
  curfew?: boolean;
  visitorsAllowed?: boolean;
  noSmoking?: boolean;
  noParties?: boolean;
  quietHours?: boolean;
  separateLease?: boolean;
  noPets?: boolean;
  tenantsCleaning?: boolean;
  curfewTime?: string;
  otherRegulations?: string;
};

export type ListingDetail = {
  id: string;
  title: string;
  area: string;
  landmark: string | null;
  occupancyOptions: ListingOccupancyOption[];
  amenities: string[];
  regulations: ListingRegulations;
  tenantPreferences: string[];
  photos: string[];
  status: "pending_review" | "published" | "warning" | "removed";
  verificationLevel: "landlord_confirmed" | "student_verified";
  confirmationCount: number;
  suspiciousCount: number;
  updatedAt: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function toPositiveNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function toPositiveInteger(
  value: string | undefined,
  fallback: number,
  max?: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  if (typeof max === "number") {
    return Math.min(parsed, max);
  }

  return parsed;
}

function normalizeAmenities(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const rawItems = Array.isArray(value)
    ? value.flatMap((entry) => entry.split(","))
    : value.split(",");

  const items = rawItems
    .map((amenity) => amenity.trim())
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

export function parseListingsSearchParams(searchParams: ListingSearchParams): {
  filters: ListingFilters;
  options: Required<ListingQueryOptions>;
} {
  const area = toSingleValue(searchParams.area)?.trim() || undefined;
  const occupancyType = toSingleValue(searchParams.occupancyType)?.trim() || undefined;
  const minRent = toPositiveNumber(toSingleValue(searchParams.minRent));
  const maxRent = toPositiveNumber(toSingleValue(searchParams.maxRent));
  const amenities = normalizeAmenities(searchParams.amenities);
  const page = toPositiveInteger(toSingleValue(searchParams.page), 1);
  const limit = toPositiveInteger(toSingleValue(searchParams.limit), DEFAULT_LIMIT, MAX_LIMIT);

  return {
    filters: {
      area,
      minRent,
      maxRent,
      occupancyType,
      amenities,
    },
    options: { page, limit },
  };
}

function buildQuery(filters: ListingFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {
    status: "published",
  };

  if (filters.area) {
    query.area = {
      $regex: filters.area,
      $options: "i",
    };
  }

  const occupancyElemMatch: Record<string, unknown> = {};

  if (filters.occupancyType) {
    occupancyElemMatch.type = filters.occupancyType;
  }

  if (typeof filters.minRent === "number" || typeof filters.maxRent === "number") {
    const rentRange: { $gte?: number; $lte?: number } = {};
    if (typeof filters.minRent === "number") {
      rentRange.$gte = filters.minRent;
    }
    if (typeof filters.maxRent === "number") {
      rentRange.$lte = filters.maxRent;
    }
    occupancyElemMatch.rentAmount = rentRange;
  }

  if (Object.keys(occupancyElemMatch).length > 0) {
    query.occupancyOptions = { $elemMatch: occupancyElemMatch };
  }

  if (filters.amenities && filters.amenities.length > 0) {
    query.amenities = { $all: filters.amenities };
  }

  return query;
}

function normalizeListing(doc: Record<string, unknown>): ListingCardData {
  const occupancyOptions = Array.isArray(doc.occupancyOptions)
    ? (doc.occupancyOptions as Array<Record<string, unknown>>)
    : [];
  const normalizedOccupancyOptions = occupancyOptions.map((option) => ({
    occupancyType: typeof option.type === "string" ? option.type : "custom",
    rent: typeof option.rentAmount === "number" ? option.rentAmount : null,
  }));
  const rentAmounts = occupancyOptions
    .map((option) => option.rentAmount)
    .filter((value): value is number => typeof value === "number");
  const minRent = rentAmounts.length > 0 ? Math.min(...rentAmounts) : null;

  const confirmationCount =
    typeof doc.confirmationCount === "number" ? doc.confirmationCount : 0;
  const suspiciousCount = typeof doc.suspiciousCount === "number" ? doc.suspiciousCount : 0;
  const reviewCount = confirmationCount + suspiciousCount;
  const starRating = reviewCount === 0 ? 0 : Number(((confirmationCount / reviewCount) * 5).toFixed(1));

  const photos = Array.isArray(doc.photos) ? (doc.photos as string[]) : [];
  const amenities = Array.isArray(doc.amenities) ? (doc.amenities as string[]) : [];

  return {
    id: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "Untitled listing",
    area: typeof doc.area === "string" ? doc.area : "Unknown area",
    occupancyOptions: normalizedOccupancyOptions,
    amenities,
    photoUrl: photos[0] ?? null,
    verificationLevel:
      doc.verificationLevel === "student_verified" ? "student_verified" : "landlord_confirmed",
    minRent,
    starRating,
    reviewCount,
  };
}

export async function getPublishedListings(
  filters: ListingFilters,
  options: ListingQueryOptions = {},
): Promise<ListingsResult> {
  const limit =
    options.limit && options.limit > 0
      ? Math.min(Math.floor(options.limit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const requestedPage = options.page && options.page > 0 ? Math.floor(options.page) : 1;

  await connectDB();

  const query = buildQuery(filters);
  const total = await Listing.countDocuments(query);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const skip = (page - 1) * limit;
  const docs = await Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  return {
    listings: docs.map((doc) => normalizeListing(doc as Record<string, unknown>)),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getListingById(
  listingId: string,
  options: { includeUnpublished?: boolean } = {},
): Promise<ListingDetail | null> {
  if (!mongoose.isValidObjectId(listingId)) {
    return null;
  }

  await connectDB();

  const doc = await Listing.findOne(
    options.includeUnpublished
      ? { _id: listingId }
      : {
          _id: listingId,
          status: { $in: ["published", "warning"] },
        },
  )
    .lean()
    .exec();

  if (!doc) {
    return null;
  }

  const occupancyOptions = Array.isArray(doc.occupancyOptions)
    ? (doc.occupancyOptions as Array<Record<string, unknown>>)
    : [];
  const amenities = Array.isArray(doc.amenities) ? (doc.amenities as string[]) : [];
  const tenantPreferences = Array.isArray(doc.tenantPreferences)
    ? (doc.tenantPreferences as string[])
    : [];
  const photos = Array.isArray(doc.photos) ? (doc.photos as string[]) : [];
  const regulations =
    doc.regulations && typeof doc.regulations === "object"
      ? (doc.regulations as ListingRegulations)
      : {};

  return {
    id: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "Untitled listing",
    area: typeof doc.area === "string" ? doc.area : "Unknown area",
    landmark: typeof doc.landmark === "string" ? doc.landmark : null,
    occupancyOptions: occupancyOptions.map((option) => ({
      type: typeof option.type === "string" ? option.type : "custom",
      rentAmount: typeof option.rentAmount === "number" ? option.rentAmount : null,
      description: typeof option.description === "string" ? option.description : null,
    })),
    amenities,
    regulations,
    tenantPreferences,
    photos,
    status:
      doc.status === "warning" || doc.status === "pending_review" || doc.status === "removed"
        ? doc.status
        : "published",
    verificationLevel:
      doc.verificationLevel === "student_verified" ? "student_verified" : "landlord_confirmed",
    confirmationCount: typeof doc.confirmationCount === "number" ? doc.confirmationCount : 0,
    suspiciousCount: typeof doc.suspiciousCount === "number" ? doc.suspiciousCount : 0,
    updatedAt:
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}
