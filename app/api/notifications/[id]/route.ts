import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  await connectDB();
  const notification = await Notification.findOneAndUpdate(
    { _id: params.id, userId: session.user.id },
    { isRead: true },
    { new: true },
  )
    .lean()
    .exec();

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(notification._id),
    isRead: Boolean(notification.isRead),
  });
}
