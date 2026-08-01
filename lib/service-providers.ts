export const SERVICE_PROVIDER_CATEGORIES = [
  "transport",
  "wifi_internet",
  "moving",
  "cleaning",
  "repairs_handyman",
  "food_catering",
  "security",
  "other",
] as const;

export const SERVICE_PROVIDER_CONTACT_METHODS = ["whatsapp", "call", "email"] as const;
export const SERVICE_PROVIDER_AVAILABILITY = [
  "always",
  "weekdays",
  "weekends",
  "on_request",
] as const;
export const SERVICE_PROVIDER_TARGET_CUSTOMERS = ["students", "landlords", "both"] as const;
export const SERVICE_PROVIDER_STATUSES = [
  "pending_review",
  "published",
  "removed",
  "unclaimed",
] as const;
export const SERVICE_PROVIDER_CONTACT_STATUSES = [
  "not_contacted",
  "contacted",
  "interested",
  "declined",
  "unreachable",
  "invited",
  "claimed",
] as const;
export const SERVICE_PROVIDER_OUTREACH_METHODS = ["call", "whatsapp", "in_person"] as const;
export const SERVICE_PROVIDER_SOURCES = ["self_signup", "admin_created", "pdf_import"] as const;

export type PreferredContact = (typeof SERVICE_PROVIDER_CONTACT_METHODS)[number];
export type ServiceCategory = (typeof SERVICE_PROVIDER_CATEGORIES)[number];
export type Availability = (typeof SERVICE_PROVIDER_AVAILABILITY)[number];
export type TargetCustomers = (typeof SERVICE_PROVIDER_TARGET_CUSTOMERS)[number];
export type ServiceProviderStatus = (typeof SERVICE_PROVIDER_STATUSES)[number];
export type ServiceProviderContactStatus = (typeof SERVICE_PROVIDER_CONTACT_STATUSES)[number];
export type ServiceProviderOutreachMethod = (typeof SERVICE_PROVIDER_OUTREACH_METHODS)[number];

export type ServiceProviderFormData = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContact: PreferredContact;
  category: ServiceCategory;
  description: string;
  areasServed: string;
  availability: Availability;
  priceRange: string;
  pricingNotes: string;
  photos: string[];
  targetCustomers: TargetCustomers;
  consentGiven: boolean;
};

export type ServiceProviderProfilePayload = Omit<ServiceProviderFormData, "consentGiven">;

export const SERVICE_PROVIDER_PROFILE_FIELDS = [
  "businessName",
  "contactName",
  "phone",
  "email",
  "preferredContact",
  "category",
  "description",
  "areasServed",
  "availability",
  "priceRange",
  "pricingNotes",
  "photos",
  "targetCustomers",
] as const;

const CATEGORIES = new Set<string>(SERVICE_PROVIDER_CATEGORIES);
const CONTACT_METHODS = new Set<string>(SERVICE_PROVIDER_CONTACT_METHODS);
const AVAILABILITY_OPTIONS = new Set<string>(SERVICE_PROVIDER_AVAILABILITY);
const TARGET_OPTIONS = new Set<string>(SERVICE_PROVIDER_TARGET_CUSTOMERS);
const STATUSES = new Set<string>(SERVICE_PROVIDER_STATUSES);
const CONTACT_STATUSES = new Set<string>(SERVICE_PROVIDER_CONTACT_STATUSES);
const OUTREACH_METHODS = new Set<string>(SERVICE_PROVIDER_OUTREACH_METHODS);
const SOURCES = new Set<string>(SERVICE_PROVIDER_SOURCES);

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeServiceProviderInput(
  body: Record<string, unknown>,
  options: { requireConsent: boolean },
):
  | { ok: true; data: ServiceProviderFormData }
  | {
      ok: false;
      error: string;
    } {
  const businessName = trimString(body.businessName);
  const contactName = trimString(body.contactName);
  const phone = trimString(body.phone);
  const email = trimString(body.email).toLowerCase();
  const preferredContact = trimString(body.preferredContact);
  const category = trimString(body.category);
  const description = trimString(body.description);
  const areasServed = trimString(body.areasServed);
  const availability = trimString(body.availability);
  const priceRange = trimString(body.priceRange);
  const pricingNotes = trimString(body.pricingNotes);
  const targetCustomers = trimString(body.targetCustomers);
  const consentGiven = body.consentGiven === true;
  const photos = Array.isArray(body.photos)
    ? body.photos
        .filter((photo): photo is string => typeof photo === "string")
        .map((photo) => photo.trim())
        .filter(Boolean)
    : [];

  if (!businessName) {
    return { ok: false, error: "Business name is required" };
  }
  if (!phone) {
    return { ok: false, error: "Phone is required" };
  }
  if (!CONTACT_METHODS.has(preferredContact)) {
    return { ok: false, error: "Preferred contact is required" };
  }
  if (!CATEGORIES.has(category)) {
    return { ok: false, error: "Category is required" };
  }
  if (!AVAILABILITY_OPTIONS.has(availability)) {
    return { ok: false, error: "Availability is required" };
  }
  if (!TARGET_OPTIONS.has(targetCustomers)) {
    return { ok: false, error: "Target customers is required" };
  }
  if (options.requireConsent && !consentGiven) {
    return { ok: false, error: "Consent is required" };
  }

  return {
    ok: true,
    data: {
      businessName,
      contactName,
      phone,
      email,
      preferredContact: preferredContact as PreferredContact,
      category: category as ServiceCategory,
      description,
      areasServed,
      availability: availability as Availability,
      priceRange,
      pricingNotes,
      photos,
      targetCustomers: targetCustomers as TargetCustomers,
      consentGiven,
    },
  };
}

export function toServiceProviderDocument(
  data: ServiceProviderFormData | ServiceProviderProfilePayload,
) {
  return {
    businessName: data.businessName,
    contactName: data.contactName || undefined,
    phone: data.phone,
    email: data.email || undefined,
    preferredContact: data.preferredContact,
    category: data.category,
    description: data.description || undefined,
    areasServed: data.areasServed || undefined,
    availability: data.availability,
    priceRange: data.priceRange || undefined,
    pricingNotes: data.pricingNotes || undefined,
    targetCustomers: data.targetCustomers,
    photos: data.photos,
  };
}

export function toServiceProviderResponse(provider: Record<string, unknown>) {
  return {
    id: String(provider._id),
    businessName: typeof provider.businessName === "string" ? provider.businessName : "",
    contactName: typeof provider.contactName === "string" ? provider.contactName : "",
    phone: typeof provider.phone === "string" ? provider.phone : "",
    email: typeof provider.email === "string" ? provider.email : "",
    preferredContact:
      provider.preferredContact === "whatsapp" ||
      provider.preferredContact === "call" ||
      provider.preferredContact === "email"
        ? provider.preferredContact
        : "call",
    category:
      provider.category === "transport" ||
      provider.category === "wifi_internet" ||
      provider.category === "moving" ||
      provider.category === "cleaning" ||
      provider.category === "repairs_handyman" ||
      provider.category === "food_catering" ||
      provider.category === "security" ||
      provider.category === "other"
        ? provider.category
        : "other",
    description: typeof provider.description === "string" ? provider.description : "",
    areasServed: typeof provider.areasServed === "string" ? provider.areasServed : "",
    availability:
      provider.availability === "always" ||
      provider.availability === "weekdays" ||
      provider.availability === "weekends" ||
      provider.availability === "on_request"
        ? provider.availability
        : "on_request",
    priceRange: typeof provider.priceRange === "string" ? provider.priceRange : "",
    pricingNotes: typeof provider.pricingNotes === "string" ? provider.pricingNotes : "",
    targetCustomers:
      provider.targetCustomers === "students" ||
      provider.targetCustomers === "landlords" ||
      provider.targetCustomers === "both"
        ? provider.targetCustomers
        : "both",
    photos: Array.isArray(provider.photos)
      ? provider.photos.filter((photo): photo is string => typeof photo === "string")
      : [],
    status:
      typeof provider.status === "string" && STATUSES.has(provider.status)
        ? provider.status
        : "pending_review",
    createdAt:
      provider.createdAt instanceof Date
        ? provider.createdAt.toISOString()
        : typeof provider.createdAt === "string"
          ? provider.createdAt
          : null,
    updatedAt:
      provider.updatedAt instanceof Date
        ? provider.updatedAt.toISOString()
        : typeof provider.updatedAt === "string"
          ? provider.updatedAt
          : null,
    source:
      typeof provider.source === "string" && SOURCES.has(provider.source)
        ? provider.source
        : "self_signup",
  };
}

export function toAdminServiceProviderRow(provider: Record<string, unknown>) {
  return {
    ...toServiceProviderResponse(provider),
    contactStatus:
      typeof provider.contactStatus === "string" && CONTACT_STATUSES.has(provider.contactStatus)
        ? provider.contactStatus
        : "not_contacted",
    contactedAt:
      provider.contactedAt instanceof Date
        ? provider.contactedAt.toISOString()
        : typeof provider.contactedAt === "string"
          ? provider.contactedAt
          : null,
    lastContactMethod:
      typeof provider.lastContactMethod === "string" && OUTREACH_METHODS.has(provider.lastContactMethod)
        ? provider.lastContactMethod
        : null,
    lastContactNotes:
      typeof provider.lastContactNotes === "string" ? provider.lastContactNotes : "",
    userId: provider.userId ? String(provider.userId) : null,
  };
}
