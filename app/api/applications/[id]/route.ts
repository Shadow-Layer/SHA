import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Application from "@/lib/models/Application";
import Conversation from "@/lib/models/Conversation";
import Listing from "@/lib/models/Listing";
import Message from "@/lib/models/Message";
import Notification from "@/lib/models/Notification";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "reject" && action !== "withdraw") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();
  const application = await Application.findById(params.id).exec();
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "withdraw") {
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (String(application.studentId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can be withdrawn" },
        { status: 400 },
      );
    }
    application.status = "withdrawn";
    await application.save();
    return NextResponse.json({ id: String(application._id), status: application.status });
  }

  if (session.user.role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (String(application.landlordId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (application.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending applications can be updated" },
      { status: 400 },
    );
  }

  const listing = await Listing.findById(application.listingId).select({ _id: 1, title: 1 }).lean().exec();
  const listingTitle = typeof listing?.title === "string" ? listing.title : "the listing";
  const listingId = listing ? String(listing._id) : String(application.listingId);

  if (action === "reject") {
    application.status = "rejected";
    await application.save();
    await Notification.create({
      userId: application.studentId,
      type: "application_rejected",
      message: `Your application for ${listingTitle} was not accepted.`,
      relatedId: listingId,
      relatedType: "listing",
    });
    return NextResponse.json({ id: String(application._id), status: application.status });
  }

  application.status = "accepted";
  await application.save();

  let conversation = await Conversation.findOne({ applicationId: application._id }).exec();
  if (!conversation) {
    conversation = await Conversation.create({
      applicationId: application._id,
      listingId: application.listingId,
      studentId: application.studentId,
      landlordId: application.landlordId,
    });
    await Message.create({
      conversationId: conversation._id,
      senderId: application.landlordId,
      body: "✅ Application accepted — you can now message here.",
    });
  }

  await Notification.create({
    userId: application.studentId,
    type: "application_accepted",
    message: `Your application for ${listingTitle} was accepted. Check your inbox.`,
    relatedId: String(conversation._id),
    relatedType: "inbox",
  });

  return NextResponse.json({
    id: String(application._id),
    status: application.status,
    conversationId: String(conversation._id),
  });
}
