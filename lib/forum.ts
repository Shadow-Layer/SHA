import "server-only";

import { connectDB } from "@/lib/db";
import type { ForumPostSummary } from "@/lib/forum-shared";
import ForumPost from "@/lib/models/ForumPost";

export {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_CONFIG,
  STUDENT_ONLY_FORUM_ACCESS_MESSAGE,
} from "@/lib/forum-shared";

export async function getListingForumPosts(listingId: string): Promise<ForumPostSummary[]> {
  await connectDB();

  const docs = await ForumPost.find({
    status: "active",
    "entityRef.type": "listing",
    "entityRef.id": listingId,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .exec();

  return docs.map((doc) => ({
    id: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "Untitled discussion",
    body: typeof doc.body === "string" ? doc.body : "",
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    upvoteCount: Array.isArray(doc.upvotes) ? doc.upvotes.length : 0,
  }));
}
