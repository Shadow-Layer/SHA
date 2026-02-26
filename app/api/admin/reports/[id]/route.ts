import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import Listing from "@/lib/models/Listing";
import Report from "@/lib/models/Report";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "resolve" && action !== "remove_target" && action !== "clear_warning") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();

  const report = await Report.findById(params.id).exec();
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "resolve") {
    report.status = "resolved";
    await report.save();
    return NextResponse.json({ id: String(report._id), status: report.status });
  }

  if (action === "clear_warning") {
    if (report.targetType !== "listing") {
      return NextResponse.json({ error: "clear_warning is only available for listing reports" }, { status: 400 });
    }

    await Listing.findByIdAndUpdate(report.targetId, { status: "published" }).exec();
    report.status = "resolved";
    await report.save();
    return NextResponse.json({ id: String(report._id), status: report.status });
  }

  if (report.targetType === "listing") {
    await Listing.findByIdAndUpdate(report.targetId, { status: "removed" }).exec();
  } else if (report.targetType === "post") {
    await ForumPost.findByIdAndUpdate(report.targetId, { status: "removed" }).exec();
  } else if (report.targetType === "comment") {
    await ForumComment.findByIdAndUpdate(report.targetId, { status: "removed" }).exec();
  }

  report.status = "resolved";
  await report.save();

  return NextResponse.json({ id: String(report._id), status: report.status });
}
