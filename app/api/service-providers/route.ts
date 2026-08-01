import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import {
  SERVICE_PROVIDER_CATEGORIES,
  normalizeServiceProviderInput,
  toServiceProviderDocument,
  toServiceProviderResponse,
} from "@/lib/service-providers";

const CATEGORIES = new Set<string>(SERVICE_PROVIDER_CATEGORIES);

export async function POST(request: NextRequest) {
  await connectDB();

  const session = await getAuthSession();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeServiceProviderInput(body, { requireConsent: true });
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const providerData = {
    ...toServiceProviderDocument(normalized.data),
    consentGiven: true,
    source: "self_signup" as const,
  };

  const isAuthenticatedProvider =
    session?.user?.role === "service_provider" && typeof session.user.id === "string";

  const provider = isAuthenticatedProvider
    ? await ServiceProvider.findOneAndUpdate(
        { userId: session.user.id },
        {
          $set: {
            ...providerData,
            userId: session.user.id,
          },
          $setOnInsert: {
            status: "pending_review",
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
        .lean()
        .exec()
    : await ServiceProvider.create({
        ...providerData,
        status: "pending_review",
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

  return NextResponse.json(providers.map((provider) => toServiceProviderResponse(provider)));
}
