import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
  const limitRaw = Number.parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  await connectDB();

  const query: Record<string, unknown> = { userId: session.user.id };
  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      id: String(notification._id),
      type: notification.type,
      message: notification.message,
      relatedId: typeof notification.relatedId === "string" ? notification.relatedId : null,
      relatedType: typeof notification.relatedType === "string" ? notification.relatedType : null,
      isRead: Boolean(notification.isRead),
      createdAt:
        notification.createdAt instanceof Date
          ? notification.createdAt.toISOString()
          : new Date().toISOString(),
    })),
  });
}
