import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Conversation from "@/lib/models/Conversation";
import Listing from "@/lib/models/Listing";
import Message from "@/lib/models/Message";
import User from "@/lib/models/User";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const selector =
    session.user.role === "landlord"
      ? { landlordId: session.user.id }
      : { studentId: session.user.id };

  const conversations = await Conversation.find(selector)
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const listingIds = Array.from(
    new Set(conversations.map((conversation) => String(conversation.listingId))),
  );
  const userIds = Array.from(
    new Set(
      conversations.flatMap((conversation) => [
        String(conversation.studentId),
        String(conversation.landlordId),
      ]),
    ),
  );
  const conversationIds = conversations.map((conversation) => conversation._id);

  const [listings, users, messages] = await Promise.all([
    Listing.find({ _id: { $in: listingIds } })
      .select({ _id: 1, title: 1 })
      .lean()
      .exec(),
    User.find({ _id: { $in: userIds } })
      .select({ _id: 1, name: 1, email: 1 })
      .lean()
      .exec(),
    Message.find({ conversationId: { $in: conversationIds } })
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
  ]);

  const listingMap = new Map(listings.map((listing) => [String(listing._id), listing]));
  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const latestMessageByConversation = new Map<string, (typeof messages)[number]>();
  messages.forEach((message) => {
    const conversationId = String(message.conversationId);
    if (!latestMessageByConversation.has(conversationId)) {
      latestMessageByConversation.set(conversationId, message);
    }
  });

  const data = conversations.map((conversation) => {
    const listing = listingMap.get(String(conversation.listingId));
    const student = userMap.get(String(conversation.studentId));
    const landlord = userMap.get(String(conversation.landlordId));
    const lastMessage = latestMessageByConversation.get(String(conversation._id));

    return {
      id: String(conversation._id),
      listingId: String(conversation.listingId),
      listingTitle: typeof listing?.title === "string" ? listing.title : "Listing",
      studentName: student?.name || student?.email || "Student",
      landlordName: landlord?.name || landlord?.email || "Landlord",
      lastMessage: typeof lastMessage?.body === "string" ? lastMessage.body : "",
      lastMessageAt:
        lastMessage?.createdAt instanceof Date
          ? lastMessage.createdAt.toISOString()
          : conversation.createdAt instanceof Date
            ? conversation.createdAt.toISOString()
            : new Date().toISOString(),
    };
  });

  data.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
  return NextResponse.json({ conversations: data });
}
