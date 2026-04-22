import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { publishInboxEvent } from "@/lib/ably";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Conversation from "@/lib/models/Conversation";
import Message from "@/lib/models/Message";

type RouteContext = {
  params: { id: string };
};

async function getConversationForUser(conversationId: string, userId: string) {
  return Conversation.findOne({
    _id: conversationId,
    $or: [{ studentId: userId }, { landlordId: userId }],
  })
    .lean()
    .exec();
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  await connectDB();
  const conversation = await getConversationForUser(params.id, session.user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await Message.find({ conversationId: params.id })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: String(message._id),
      conversationId: String(message.conversationId),
      senderId: String(message.senderId),
      body: message.body,
      readAt: message.readAt instanceof Date ? message.readAt.toISOString() : null,
      createdAt:
        message.createdAt instanceof Date ? message.createdAt.toISOString() : new Date().toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  let bodyData: Record<string, unknown>;
  try {
    bodyData = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = typeof bodyData.body === "string" ? bodyData.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  await connectDB();
  const conversation = await getConversationForUser(params.id, session.user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await Message.create({
    conversationId: params.id,
    senderId: session.user.id,
    body,
  });
  const createdAt =
    message.createdAt instanceof Date ? message.createdAt.toISOString() : new Date().toISOString();

  try {
    await publishInboxEvent(params.id, "message:new", {
      id: String(message._id),
      senderId: String(message.senderId),
      body: message.body,
      createdAt,
    });
  } catch (error) {
    console.error("Failed to publish Ably message", error);
  }

  return NextResponse.json(
    {
      id: String(message._id),
      conversationId: String(message.conversationId),
      senderId: String(message.senderId),
      body: message.body,
      readAt: message.readAt instanceof Date ? message.readAt.toISOString() : null,
      createdAt,
    },
    { status: 201 },
  );
}
