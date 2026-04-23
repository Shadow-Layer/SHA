import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import {
  normalizeServiceProviderInput,
  SERVICE_PROVIDER_PROFILE_FIELDS,
  toServiceProviderDocument,
  toServiceProviderResponse,
} from "@/lib/service-providers";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  await connectDB();

  const session = await getAuthSession();
  if (!session?.user || session.user.role !== "service_provider" || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if ("status" in body) {
    return NextResponse.json({ error: "Status cannot be updated here" }, { status: 400 });
  }

  const provider = await ServiceProvider.findById(params.id).lean().exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  if (String(provider.userId ?? "") !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedBody = Object.fromEntries(
    SERVICE_PROVIDER_PROFILE_FIELDS.flatMap((field) =>
      field in body ? [[field, body[field]]] : [],
    ),
  );

  if (Object.keys(allowedBody).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const normalized = normalizeServiceProviderInput(
    {
      ...toServiceProviderResponse(provider),
      ...allowedBody,
      consentGiven: true,
    },
    { requireConsent: false },
  );
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const updatedProvider = await ServiceProvider.findByIdAndUpdate(
    params.id,
    {
      $set: toServiceProviderDocument(normalized.data),
    },
    { new: true },
  )
    .lean()
    .exec();

  if (!updatedProvider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  return NextResponse.json({ provider: toServiceProviderResponse(updatedProvider) });
}
