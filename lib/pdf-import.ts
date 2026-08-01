import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export type ImportRow = {
  ownerName: string;
  phone: string;
  address: string;
  area: string;
  capacity?: number | string | null;
  utilities?: string | null;
  genderPreference?: string | null;
  rentalCharges?: string | null;
};

export type SPImportRow = {
  businessName: string;
  phone: string;
  contactName?: string | null;
  category?: string | null;
  areasServed?: string | null;
  description?: string | null;
  priceRange?: string | null;
  email?: string | null;
};

const AMENITY_PATTERNS: Array<{ amenity: string; pattern: RegExp }> = [
  { amenity: "wifi", pattern: /\bwi[\s-]?fi\b/i },
  { amenity: "borehole", pattern: /\bborehole\b/i },
  { amenity: "prepaid_zesa", pattern: /\b(zesa|electricity)\b/i },
  { amenity: "backup_power", pattern: /\b(solar|backup)\b/i },
  { amenity: "kitchen", pattern: /\bkitchen\b/i },
  { amenity: "laundry", pattern: /\blaundry\b/i },
  { amenity: "ensuite", pattern: /\ben[\s-]?suite\b/i },
  { amenity: "parking", pattern: /\bparking\b/i },
  { amenity: "burglar_bars", pattern: /\bburglar\b/i },
];

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeSPCategory(value: string | null | undefined) {
  const normalized = normalizeFreeText(value).toLowerCase();

  if (!normalized) {
    return "other" as const;
  }

  if (
    normalized.includes("wifi") ||
    normalized.includes("wi-fi") ||
    normalized.includes("internet") ||
    normalized.includes("broadband")
  ) {
    return "wifi_internet" as const;
  }

  if (
    normalized.includes("transport") ||
    normalized.includes("taxi") ||
    normalized.includes("shuttle") ||
    normalized.includes("bus") ||
    normalized.includes("travel")
  ) {
    return "transport" as const;
  }

  if (
    normalized.includes("move") ||
    normalized.includes("relocat") ||
    normalized.includes("removal")
  ) {
    return "moving" as const;
  }

  if (
    normalized.includes("clean") ||
    normalized.includes("laundry") ||
    normalized.includes("housekeep")
  ) {
    return "cleaning" as const;
  }

  if (
    normalized.includes("repair") ||
    normalized.includes("handyman") ||
    normalized.includes("plumb") ||
    normalized.includes("electric") ||
    normalized.includes("maint")
  ) {
    return "repairs_handyman" as const;
  }

  if (
    normalized.includes("food") ||
    normalized.includes("cater") ||
    normalized.includes("meal") ||
    normalized.includes("kitchen")
  ) {
    return "food_catering" as const;
  }

  if (normalized.includes("security") || normalized.includes("guard")) {
    return "security" as const;
  }

  return "other" as const;
}

export function parseCapacity(value: ImportRow["capacity"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      return Number.parseInt(match[0], 10);
    }
  }

  return undefined;
}

export function parsePricingPeriod(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("semester")) {
    return "semester" as const;
  }
  if (
    normalized.includes("month") ||
    normalized.includes("/mo") ||
    normalized.includes("per month") ||
    normalized.includes("monthly")
  ) {
    return "month" as const;
  }

  return "unknown" as const;
}

export function parseAmenities(utilities: string | null | undefined) {
  if (!utilities) {
    return [];
  }

  const found = new Set<string>();
  for (const entry of AMENITY_PATTERNS) {
    if (entry.pattern.test(utilities)) {
      found.add(entry.amenity);
    }
  }

  return Array.from(found);
}

export function mapTenantPreferences(genderPreference: string | null | undefined) {
  const normalized = genderPreference?.trim().toLowerCase();
  if (normalized === "female") {
    return ["Female only"];
  }
  if (normalized === "male") {
    return ["Male only"];
  }

  return [];
}

export function createPlaceholderEmail(phoneDigits: string) {
  const suffix = phoneDigits || uuidv4().replace(/-/g, "").slice(0, 12);
  return `landlord_${suffix}@sha.internal`;
}

export function normalizeFreeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function splitImportedAddress(address: string, explicitArea?: string | null) {
  const cleanAddress = normalizeFreeText(address);
  const parts = cleanAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const area = normalizeFreeText(explicitArea) || parts[parts.length - 1] || "Unknown Area";
  const landmark = parts.length > 1 ? parts.slice(0, -1).join(", ") : cleanAddress;

  return {
    area,
    landmark: landmark || cleanAddress,
  };
}

export async function hashInviteToken(token: string) {
  return bcrypt.hash(token, 12);
}

export async function matchesInviteToken(token: string, storedHash: string) {
  return bcrypt.compare(token, storedHash);
}
