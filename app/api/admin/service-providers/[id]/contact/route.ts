import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import ServiceProviderOutreachEvent from "@/lib/models/ServiceProviderOutreachEvent";
import {
  type ServiceProviderContactStatus,
  type ServiceProviderOutreachMethod,
} from "@/lib/service-providers";

type RouteContext = {
  params: { id: string };
};

type PatchBody = {
  contactStatus?: ServiceProviderContactStatus;
  method?: ServiceProviderOutreachMethod;
  notes?: string;
};

const CONTACT_STATUSES = new Set<ServiceProviderContactStatus>([
  "contacted",
  "interested",
  "declined",
  "unreachable",
]);
const CONTACT_METHODS = new Set<ServiceProviderOutreachMethod>([
  "call",
  "whatsapp",
  "in_person",
]);

function getEffectiveContactMethod(
  provider: {
    lastContactMethod?: unknown;
    preferredContact?: unknown;
  },
  requestedMethod?: ServiceProviderOutreachMethod,
) {
  if (requestedMethod && CONTACT_METHODS.has(requestedMethod)) {
    return requestedMethod;
  }

  if (
    provider.lastContactMethod === "call" ||
    provider.lastContactMethod === "whatsapp" ||
    provider.lastContactMethod === "in_person"
  ) {
    return provider.lastContactMethod;
  }

  if (provider.preferredContact === "call" || provider.preferredContact === "whatsapp") {
    return provider.preferredContact;
  }

  return "call";
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contactStatus = body.contactStatus;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const requestedMethod = body.method;

  if (!contactStatus || !CONTACT_STATUSES.has(contactStatus)) {
    return NextResponse.json({ error: "Invalid contactStatus" }, { status: 400 });
  }

  if (requestedMethod && !CONTACT_METHODS.has(requestedMethod)) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  await connectDB();

  const provider = await ServiceProvider.findById(params.id).exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const now = new Date();
  const effectiveMethod =
    contactStatus === "declined" || contactStatus === "unreachable"
      ? requestedMethod
      : getEffectiveContactMethod(provider, requestedMethod);
  const eventNotes =
    contactStatus === "contacted" || contactStatus === "interested"
      ? notes || `Contact method: ${formatOutreachMethod(effectiveMethod)}`
      : notes;

  provider.contactStatus = contactStatus;
  provider.contactedAt = now;
  provider.lastContactNotes = notes;

  if (effectiveMethod) {
    provider.lastContactMethod = effectiveMethod;
  }

  await provider.save();

  await ServiceProviderOutreachEvent.create({
    providerId: provider._id,
    type:
      contactStatus === "contacted" || contactStatus === "interested"
        ? contactStatus
        : contactStatus === "declined" || contactStatus === "unreachable"
          ? contactStatus
          : effectiveMethod,
    notes: eventNotes,
    createdBy: session.user.id,
    createdAt: now,
  });

  return NextResponse.json({ ok: true });
}

function formatOutreachMethod(method?: ServiceProviderOutreachMethod) {
  if (!method) {
    return "Unknown";
  }

  return method.replace(/_/g, " ");
}
