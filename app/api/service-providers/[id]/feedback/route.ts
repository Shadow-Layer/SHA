import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProviderFeedback from "@/lib/models/ServiceProviderFeedback";
import ServiceProvider from "@/lib/models/ServiceProvider";
import {
  isValidObjectId,
  recalculateServiceProviderStats,
  serializeFeedbackRecords,
} from "@/lib/service-provider-feedback";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  await connectDB();

  const provider = await ServiceProvider.findOne({ _id: params.id, status: "published" })
    .select({ _id: 1, rating: 1, feedbackCount: 1 })
    .lean()
    .exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const feedbackRecords = await ServiceProviderFeedback.find({
    providerId: params.id,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return NextResponse.json({
    feedback: await serializeFeedbackRecords(feedbackRecords),
    averageRating:
      typeof provider.rating === "number" && Number.isFinite(provider.rating) ? provider.rating : 0,
    totalCount: typeof provider.feedbackCount === "number" ? provider.feedbackCount : 0,
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isValidObjectId(params.id)) {
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

  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const isAnonymous = body.isAnonymous !== false;
  const consentToReveal = body.consentToReveal === true;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 });
  }

  await connectDB();

  const provider = await ServiceProvider.findOne({ _id: params.id, status: "published" })
    .select({ _id: 1 })
    .lean()
    .exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const feedbackRecord = await ServiceProviderFeedback.findOneAndUpdate(
    { providerId: params.id, authorId: session.user.id },
    {
      $set: {
        rating,
        comment: comment || undefined,
        isAnonymous,
        consentToReveal,
        status: "active",
      },
      $setOnInsert: {
        providerId: params.id,
        authorId: session.user.id,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();

  const { averageRating, totalCount } = await recalculateServiceProviderStats(params.id);
  const [serializedFeedback] = await serializeFeedbackRecords([feedbackRecord]);

  return NextResponse.json(
    {
      feedback: serializedFeedback,
      averageRating,
      totalCount,
    },
    { status: 201 },
  );
}
