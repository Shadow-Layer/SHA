import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";

const STATUSES = new Set(["pending_review", "published", "removed"]);

function toAdminProvider(provider: Record<string, unknown>) {
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
    status:
      provider.status === "published" || provider.status === "removed"
        ? provider.status
        : "pending_review",
    consentGiven: Boolean(provider.consentGiven),
    source:
      provider.source === "admin_created" || provider.source === "self_signup"
        ? provider.source
        : "self_signup",
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

export async function GET(request: NextRequest) {
  await connectDB();

  const session = await getAuthSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status")?.trim() || "";
  const query = status && STATUSES.has(status) ? { status } : {};

  const providers = await ServiceProvider.find(query).sort({ createdAt: -1 }).lean().exec();

  return NextResponse.json({
    providers: providers.map((provider) => toAdminProvider(provider as Record<string, unknown>)),
  });
}
