import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { FORUM_CATEGORIES } from "@/lib/forum";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import ServiceProvider from "@/lib/models/ServiceProvider";
import User from "@/lib/models/User";

const CATEGORIES = new Set<string>(FORUM_CATEGORIES);

function canReadCategory(role: string | undefined, category: (typeof FORUM_CATEGORIES)[number]) {
  return role === "student" || ((role === "landlord" || role === "service_provider") && category === "services");
}

function canCreateCategory(role: string | undefined, category: (typeof FORUM_CATEGORIES)[number]) {
  return role === "student" || (role === "landlord" && category === "services");
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCategory = searchParams.get("category");
  const categoryKey =
    requestedCategory && CATEGORIES.has(requestedCategory)
      ? (requestedCategory as (typeof FORUM_CATEGORIES)[number])
      : null;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const sort = searchParams.get("sort") === "upvotes" ? "upvotes" : "recent";
  const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1), 50);
  const effectiveCategory =
    session.user.role === "student" ? categoryKey : categoryKey ?? "services";

  if (!canReadCategory(session.user.role, effectiveCategory)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query: Record<string, unknown> = { status: "active" };
  if (effectiveCategory) {
    query.category = effectiveCategory;
  }
  if (entityType && entityId) {
    query["entityRef.type"] = entityType;
    query["entityRef.id"] = entityId;
  }

  await connectDB();
  const total = await ForumPost.countDocuments(query);
  const skip = (page - 1) * limit;
  const posts = await ForumPost.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
  const sortedPosts =
    sort === "upvotes"
      ? [...posts].sort((a, b) => {
          const aVotes = Array.isArray(a.upvotes) ? a.upvotes.length : 0;
          const bVotes = Array.isArray(b.upvotes) ? b.upvotes.length : 0;
          return bVotes - aVotes;
        })
      : posts;

  const postIds = sortedPosts.map((post) => post._id);
  const authorIds = Array.from(new Set(sortedPosts.map((post) => String(post.authorId))));

  const [commentsByPost, authors, providerAuthors] = await Promise.all([
    ForumComment.aggregate([
      { $match: { postId: { $in: postIds }, status: "active" } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    User.find({ _id: { $in: authorIds } })
      .select({ _id: 1, name: 1, email: 1 })
      .lean()
      .exec(),
    sortedPosts.some((post) => post.category === "services")
      ? ServiceProvider.find({ userId: { $in: authorIds } })
          .select({ _id: 1, userId: 1, businessName: 1 })
          .lean()
          .exec()
      : Promise.resolve([]),
  ]);

  const commentCountMap = new Map(
    commentsByPost.map((item) => [String(item._id), Number(item.count) || 0]),
  );
  const authorMap = new Map(authors.map((author) => [String(author._id), author]));
  const providerAuthorMap = new Map(
    providerAuthors.map((provider) => [
      String(provider.userId),
      typeof provider.businessName === "string" ? provider.businessName : "",
    ]),
  );

  return NextResponse.json({
    posts: sortedPosts.map((post) => ({
      id: String(post._id),
      category: post.category,
      title: post.title,
      body: post.body,
      entityRef: post.entityRef || null,
      authorName:
        (post.category === "services" ? providerAuthorMap.get(String(post.authorId)) : "") ||
        authorMap.get(String(post.authorId))?.name ||
        authorMap.get(String(post.authorId))?.email ||
        "Anonymous",
      commentCount: commentCountMap.get(String(post._id)) || 0,
      upvoteCount: Array.isArray(post.upvotes) ? post.upvotes.length : 0,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : new Date().toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
}

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

  const category = typeof body.category === "string" ? body.category : "";
  const categoryKey = CATEGORIES.has(category)
    ? (category as (typeof FORUM_CATEGORIES)[number])
    : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const postBody = typeof body.body === "string" ? body.body.trim() : "";

  if (!categoryKey) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!canCreateCategory(session.user.role, categoryKey)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!title || !postBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const entityRefRaw =
    body.entityRef && typeof body.entityRef === "object"
      ? (body.entityRef as Record<string, unknown>)
      : null;
  const entityType =
    typeof entityRefRaw?.type === "string" ? entityRefRaw.type : undefined;
  const entityId = typeof entityRefRaw?.id === "string" ? entityRefRaw.id.trim() : undefined;

  const entityRef =
    entityType && entityId
      ? {
          type: entityType,
          id: entityId,
        }
      : undefined;

  await connectDB();
  const post = await ForumPost.create({
    authorId: session.user.id,
    category: categoryKey,
    title,
    body: postBody,
    entityRef,
  });

  return NextResponse.json({ id: String(post._id) }, { status: 201 });
}
