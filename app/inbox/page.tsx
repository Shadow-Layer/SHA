import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Conversation from "@/lib/models/Conversation";
import Listing from "@/lib/models/Listing";
import Message from "@/lib/models/Message";
import User from "@/lib/models/User";
import InboxClient from "@/components/inbox/InboxClient";

export default async function InboxPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/inbox");
  }

  await connectDB();
  const selector: Record<string, unknown> = {};
  if (session.user.role === "landlord") {
    selector.landlordId = session.user.id;
  } else {
    selector.studentId = session.user.id;
  }

  const rawConversations = await Conversation.find(selector).sort({ createdAt: -1 }).lean().exec();
  const listingIds = rawConversations.map((c) => c.listingId);
  const userIds = rawConversations.map((c) => (session.user.role === "landlord" ? c.studentId : c.landlordId));
  const conversationIds = rawConversations.map((c) => String(c._id));

  const [listings, users, messages] = await Promise.all([
    Listing.find({ _id: { $in: listingIds } }).lean().exec(),
    User.find({ _id: { $in: userIds } }).lean().exec(),
    Message.find({ conversationId: { $in: conversationIds } })
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
  ]);

  const listingMap = new Map(listings.map((l) => [String(l._id), l]));
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const latestMessageByConversation = new Map<string, { body: string; createdAt: Date }>();
  messages.forEach((m) => {
    const cid = String(m.conversationId);
    if (!latestMessageByConversation.has(cid)) {
      latestMessageByConversation.set(cid, { body: m.body, createdAt: m.createdAt });
    }
  });

  const conversations = rawConversations.map((c) => {
    const listing = listingMap.get(String(c.listingId));
    const otherUser =
      session.user.role === "landlord"
        ? userMap.get(String(c.studentId))
        : userMap.get(String(c.landlordId));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void listing;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void otherUser;
    const lastMessage = latestMessageByConversation.get(String(c._id));

    return {
      id: String(c._id),
      listingId: String(c.listingId),
      listingTitle: listing?.title || "",
      studentName: userMap.get(String(c.studentId))?.name || "",
      landlordName: userMap.get(String(c.landlordId))?.name || "",
      lastMessage: lastMessage?.body || "",
      lastMessageAt:
        lastMessage?.createdAt instanceof Date
          ? lastMessage.createdAt.toISOString()
          : c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : new Date().toISOString(),
    };
  });

  conversations.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

  let initialMessages: Array<{
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }> = [];
  if (conversations.length > 0) {
    const rawMessages = await Message.find({ conversationId: conversations[0].id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    initialMessages = rawMessages.map((m) => ({
      id: String(m._id),
      conversationId: String(m.conversationId),
      senderId: String(m.senderId),
      body: m.body,
      readAt: m.readAt instanceof Date ? m.readAt.toISOString() : null,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    }));
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <InboxClient
        currentUserId={session.user.id}
        role={session.user.role as "student" | "landlord" | "admin"}
        conversations={conversations}
        initialConversationId={conversations[0]?.id ?? null}
        initialMessages={initialMessages}
      />
    </main>
  );
}
