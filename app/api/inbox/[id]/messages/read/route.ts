import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { publishInboxEvent } from "@/lib/ably";
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

export async function PATCH(_request: Request, { params }: RouteContext) {
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

  const otherUserId =
    String(conversation.studentId) === session.user.id
      ? String(conversation.landlordId)
      : String(conversation.studentId);
  const readAt = new Date();
  const result = await Message.updateMany(
    {
      conversationId: params.id,
      senderId: otherUserId,
      readAt: null,
    },
    {
      $set: { readAt },
    },
  ).exec();
  const updated = typeof result.modifiedCount === "number" ? result.modifiedCount : 0;

  if (updated > 0) {
    try {
      await publishInboxEvent(params.id, "read:receipt", {
        conversationId: params.id,
        userId: session.user.id,
        readAt: readAt.toISOString(),
        updated,
      });
    } catch (error) {
      console.error("Failed to publish Ably read receipt", error);
    }
  }

  return NextResponse.json({ updated });
}
