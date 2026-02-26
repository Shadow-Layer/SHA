import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ForumPost from "@/lib/models/ForumPost";

type RouteContext = {
  params: { id: string };
};

function requireStudentSession(role?: string) {
  return role === "student";
}

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireStudentSession(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  await connectDB();
  const post = await ForumPost.findOne({ _id: params.id, status: "active" }).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const existingIndex = post.upvotes.findIndex(
    (upvote: mongoose.Types.ObjectId) => String(upvote) === userId,
  );
  let upvoted = false;
  if (existingIndex >= 0) {
    post.upvotes.splice(existingIndex, 1);
  } else {
    post.upvotes.push(new mongoose.Types.ObjectId(userId));
    upvoted = true;
  }

  await post.save();
  return NextResponse.json({ upvoted, upvoteCount: post.upvotes.length });
}
