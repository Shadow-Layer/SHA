import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Report from "@/lib/models/Report";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetType = body.targetType;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (targetType !== "listing" && targetType !== "post" && targetType !== "comment") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }
  if (!mongoose.isValidObjectId(targetId)) {
    return NextResponse.json({ error: "Invalid targetId" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  await connectDB();
  const report = await Report.create({
    targetType,
    targetId,
    reporterId: session.user.id,
    reason,
    status: "pending",
  });

  return NextResponse.json({ id: String(report._id) }, { status: 201 });
}
