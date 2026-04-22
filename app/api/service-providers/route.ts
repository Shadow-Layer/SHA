import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";

const CATEGORIES = new Set([
  "transport",
  "wifi_internet",
  "moving",
  "cleaning",
  "repairs_handyman",
  "food_catering",
  "security",
  "other",
]);
const CONTACT_METHODS = new Set(["whatsapp", "call", "email"]);
const AVAILABILITY_OPTIONS = new Set(["always", "weekdays", "weekends", "on_request"]);
const TARGET_CUSTOMERS = new Set(["students", "landlords", "both"]);

function toPublicProvider(provider: Record<string, unknown>) {
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
    category: typeof provider.category === "string" ? provider.category : "other",
    description: typeof provider.description === "string" ? provider.description : "",
    areasServed: typeof provider.areasServed === "string" ? provider.areasServed : "",
    availability: typeof provider.availability === "string" ? provider.availability : "on_request",
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
    status: "published" as const,
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
  };
}

export async function POST(request: NextRequest) {
  await connectDB();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const preferredContact =
    typeof body.preferredContact === "string" ? body.preferredContact.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const areasServed = typeof body.areasServed === "string" ? body.areasServed.trim() : "";
  const availability = typeof body.availability === "string" ? body.availability.trim() : "";
  const priceRange = typeof body.priceRange === "string" ? body.priceRange.trim() : "";
  const pricingNotes = typeof body.pricingNotes === "string" ? body.pricingNotes.trim() : "";
  const targetCustomers =
    typeof body.targetCustomers === "string" ? body.targetCustomers.trim() : "";
  const consentGiven = body.consentGiven === true;
  const photos = Array.isArray(body.photos)
    ? body.photos.filter((photo): photo is string => typeof photo === "string" && photo.trim() !== "")
    : [];

  if (!businessName) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }
  if (!CONTACT_METHODS.has(preferredContact)) {
    return NextResponse.json({ error: "Preferred contact is required" }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!AVAILABILITY_OPTIONS.has(availability)) {
    return NextResponse.json({ error: "Availability is required" }, { status: 400 });
  }
  if (!TARGET_CUSTOMERS.has(targetCustomers)) {
    return NextResponse.json({ error: "Target customers is required" }, { status: 400 });
  }
  if (!consentGiven) {
    return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  }
  const provider = await ServiceProvider.create({
    businessName,
    contactName: contactName || undefined,
    phone,
    email: email || undefined,
    preferredContact,
    category,
    description: description || undefined,
    areasServed: areasServed || undefined,
    availability,
    priceRange: priceRange || undefined,
    pricingNotes: pricingNotes || undefined,
    targetCustomers,
    photos,
    status: "pending_review",
    consentGiven: true,
    source: "self_signup",
  });

  return NextResponse.json(
    {
      id: String(provider._id),
      message: "Your service has been submitted for review. We'll be in touch.",
    },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  await connectDB();

  const category = request.nextUrl.searchParams.get("category")?.trim() || "";

  const query: Record<string, unknown> = { status: "published" };
  if (category && CATEGORIES.has(category)) {
    query.category = category;
  }

  const providers = await ServiceProvider.find(query)
    .sort({ businessName: 1 })
    .lean()
    .exec();

  return NextResponse.json(
    providers.map((provider) => toPublicProvider(provider as Record<string, unknown>)),
  );
}
