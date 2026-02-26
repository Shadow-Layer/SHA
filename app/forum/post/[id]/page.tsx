import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import PostDetailClient from "@/components/forum/PostDetailClient";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import User from "@/lib/models/User";

type PostDetailPageProps = {
  params: { id: string };
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/forum/post/${params.id}`);
  }
  if (session.user.role !== "student") {
    redirect("/dashboard");
  }
  if (!mongoose.isValidObjectId(params.id)) {
    notFound();
  }

  await connectDB();
  const post = await ForumPost.findOne({ _id: params.id, status: "active" }).lean().exec();
  if (!post) {
    notFound();
  }

  const comments = await ForumComment.find({ postId: params.id, status: "active" })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
  const authorIds = Array.from(
    new Set([String(post.authorId), ...comments.map((comment) => String(comment.authorId))]),
  );
  const authors = await User.find({ _id: { $in: authorIds } })
    .select({ _id: 1, name: 1, email: 1 })
    .lean()
    .exec();
  const authorMap = new Map(authors.map((author) => [String(author._id), author]));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href={`/forum/${post.category}`} className="text-sm underline">
        Back to {post.category.replace("_", " ")}
      </Link>
      <article className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {authorMap.get(String(post.authorId))?.name ||
            authorMap.get(String(post.authorId))?.email ||
            "Anonymous"}
        </p>
        {post.entityRef?.id ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Entity: {post.entityRef.type} ·{" "}
            {post.entityRef.type === "listing" ? (
              <Link className="underline" href={`/listings/${post.entityRef.id}`}>
                {post.entityRef.id}
              </Link>
            ) : (
              post.entityRef.id
            )}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-sm">{post.body}</p>

        <PostDetailClient
          postId={String(post._id)}
          upvoteCount={Array.isArray(post.upvotes) ? post.upvotes.length : 0}
          comments={comments.map((comment) => ({
            id: String(comment._id),
            body: comment.body,
            authorName:
              authorMap.get(String(comment.authorId))?.name ||
              authorMap.get(String(comment.authorId))?.email ||
              "Anonymous",
            createdAt:
              comment.createdAt instanceof Date
                ? comment.createdAt.toISOString()
                : new Date().toISOString(),
          }))}
        />
      </article>
    </main>
  );
}
