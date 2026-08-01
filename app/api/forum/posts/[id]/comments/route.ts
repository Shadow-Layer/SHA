import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import ServiceProvider from "@/lib/models/ServiceProvider";
import User from "@/lib/models/User";

type RouteContext = {
  params: { id: string };
};

function canCommentOnPost(role: string | undefined, postCategory: string) {
  return (
    role === "student" ||
    ((role === "landlord" || role === "service_provider") && postCategory === "services")
  );
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  await connectDB();
  const post = await ForumPost.findOne({ _id: params.id, status: "active" })
    .select({ _id: 1, category: 1 })
    .lean()
    .exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (!canCommentOnPost(session.user.role, post.category)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await ForumComment.find({ postId: params.id, status: "active" })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
  const authorIds = Array.from(new Set(comments.map((comment) => String(comment.authorId))));
  const [authors, providerAuthors] = await Promise.all([
    User.find({ _id: { $in: authorIds } }).select({ _id: 1, name: 1, email: 1 }).lean().exec(),
    post.category === "services"
      ? ServiceProvider.find({ userId: { $in: authorIds } })
          .select({ _id: 1, userId: 1, businessName: 1 })
          .lean()
          .exec()
      : Promise.resolve([]),
  ]);
  const authorMap = new Map(authors.map((author) => [String(author._id), author]));
  const providerAuthorMap = new Map(
    providerAuthors.map((provider) => [
      String(provider.userId),
      typeof provider.businessName === "string" ? provider.businessName : "",
    ]),
  );

  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: String(comment._id),
      body: comment.body,
      authorName:
        (post.category === "services" ? providerAuthorMap.get(String(comment.authorId)) : "") ||
        authorMap.get(String(comment.authorId))?.name ||
        authorMap.get(String(comment.authorId))?.email ||
        "Anonymous",
      createdAt:
        comment.createdAt instanceof Date ? comment.createdAt.toISOString() : new Date().toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  let bodyData: Record<string, unknown>;
  try {
    bodyData = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = typeof bodyData.body === "string" ? bodyData.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  await connectDB();
  const post = await ForumPost.findOne({ _id: params.id, status: "active" }).lean().exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (!canCommentOnPost(session.user.role, post.category)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (post.category === "services" && session.user.role === "service_provider") {
    const provider = await ServiceProvider.findOne({ userId: session.user.id })
      .select({ _id: 1, businessName: 1 })
      .lean()
      .exec();
    if (!provider?.businessName) {
      return NextResponse.json({ error: "Create your provider profile before responding" }, { status: 400 });
    }
  }

  const comment = await ForumComment.create({
    postId: params.id,
    authorId: session.user.id,
    body,
    status: "active",
  });

  return NextResponse.json({ id: String(comment._id) }, { status: 201 });
}
