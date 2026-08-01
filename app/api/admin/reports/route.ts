import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import Listing from "@/lib/models/Listing";
import Report from "@/lib/models/Report";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status") === "resolved" ? "resolved" : "pending";

  await connectDB();

  const reports = await Report.find({ status })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  const reporterIds = Array.from(new Set(reports.map((report) => String(report.reporterId))));
  const listingIds = reports
    .filter((report) => report.targetType === "listing")
    .map((report) => report.targetId);
  const postIds = reports.filter((report) => report.targetType === "post").map((report) => report.targetId);
  const commentIds = reports
    .filter((report) => report.targetType === "comment")
    .map((report) => report.targetId);

  const [reporters, listings, posts, comments] = await Promise.all([
    User.find({ _id: { $in: reporterIds } }).select({ _id: 1, name: 1, email: 1 }).lean().exec(),
    Listing.find({ _id: { $in: listingIds } }).select({ _id: 1, title: 1, status: 1 }).lean().exec(),
    ForumPost.find({ _id: { $in: postIds } }).select({ _id: 1, title: 1, status: 1 }).lean().exec(),
    ForumComment.find({ _id: { $in: commentIds } }).select({ _id: 1, body: 1, status: 1 }).lean().exec(),
  ]);

  const reporterMap = new Map(reporters.map((reporter) => [String(reporter._id), reporter]));
  const listingMap = new Map(listings.map((listing) => [String(listing._id), listing]));
  const postMap = new Map(posts.map((post) => [String(post._id), post]));
  const commentMap = new Map(comments.map((comment) => [String(comment._id), comment]));

  return NextResponse.json({
    reports: reports.map((report) => {
      const reporter = reporterMap.get(String(report.reporterId));

      let targetPreview = "[Missing target]";
      let targetStatus = "unknown";

      if (report.targetType === "listing") {
        const listing = listingMap.get(String(report.targetId));
        targetPreview = listing?.title || "[Missing listing]";
        targetStatus = typeof listing?.status === "string" ? listing.status : "unknown";
      } else if (report.targetType === "post") {
        const post = postMap.get(String(report.targetId));
        targetPreview = post?.title || "[Missing post]";
        targetStatus = typeof post?.status === "string" ? post.status : "unknown";
      } else {
        const comment = commentMap.get(String(report.targetId));
        targetPreview = comment?.body ? comment.body.slice(0, 120) : "[Missing comment]";
        targetStatus = typeof comment?.status === "string" ? comment.status : "unknown";
      }

      return {
        id: String(report._id),
        targetType: report.targetType,
        targetId: String(report.targetId),
        targetPreview,
        targetStatus,
        reporterName: reporter?.name || reporter?.email || "Reporter",
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : new Date().toISOString(),
      };
    }),
  });
}
