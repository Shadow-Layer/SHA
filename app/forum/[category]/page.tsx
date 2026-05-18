import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import NewPostModal from "@/components/forum/NewPostModal";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_CONFIG,
  STUDENT_ONLY_FORUM_ACCESS_MESSAGE,
} from "@/lib/forum-shared";
import ForumComment from "@/lib/models/ForumComment";
import ForumPost from "@/lib/models/ForumPost";
import ServiceProvider from "@/lib/models/ServiceProvider";
import User from "@/lib/models/User";

type ForumCategoryPageProps = {
  params: { category: string };
  searchParams: { sort?: string; entityType?: string; entityId?: string };
};

type ForumCategoryPost = {
  _id: unknown;
  authorId: unknown;
  body: string;
  category: string;
  createdAt?: Date | string;
  entityRef?: {
    id?: string;
    type?: string;
  } | null;
  title: string;
  upvotes?: unknown[];
};

function formatTimeAgo(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / (1000 * 60));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function ForumCategoryPage({ params, searchParams }: ForumCategoryPageProps) {
  const category = params.category;
  if (!FORUM_CATEGORIES.includes(category as (typeof FORUM_CATEGORIES)[number])) {
    notFound();
  }
  const categoryKey = category as (typeof FORUM_CATEGORIES)[number];
  const isServicesCategory = categoryKey === "services";

  const session = await getAuthSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/forum/${category}`);
  }
  const canAccessCategory =
    session.user.role === "student" ||
    ((session.user.role === "landlord" || session.user.role === "service_provider") &&
      isServicesCategory);
  const canCreatePost =
    session.user.role === "student" || (session.user.role === "landlord" && isServicesCategory);
  const showStudentOnlyAccessNote =
    !canAccessCategory &&
    (session.user.role === "landlord" || session.user.role === "admin");
  const showStudentOnlyPostingNote =
    session.user.role === "landlord" || session.user.role === "admin";

  if (!canAccessCategory && !showStudentOnlyAccessNote) {
    redirect("/dashboard");
  }

  const sortByUpvotes = searchParams.sort === "upvotes";
  const entityType = searchParams.entityType;
  const entityId = searchParams.entityId;

  let sortedPosts: ForumCategoryPost[] = [];
  let commentCountMap = new Map<string, number>();
  let authorMap = new Map<string, { _id: unknown; name?: string; email?: string }>();
  let providerAuthorMap = new Map<string, string>();

  if (!showStudentOnlyAccessNote) {
    await connectDB();
    const query: Record<string, unknown> = { status: "active", category };
    if (entityType && entityId) {
      query["entityRef.type"] = entityType;
      query["entityRef.id"] = entityId;
    }

    const posts = (await ForumPost.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec()) as ForumCategoryPost[];
    sortedPosts = sortByUpvotes
      ? [...posts].sort((a, b) => {
          const aVotes = Array.isArray(a.upvotes) ? a.upvotes.length : 0;
          const bVotes = Array.isArray(b.upvotes) ? b.upvotes.length : 0;
          return bVotes - aVotes;
        })
      : posts;

    const postIds = sortedPosts.map((post) => post._id);
    const authorIds = Array.from(new Set(sortedPosts.map((post) => String(post.authorId))));
    const [commentCounts, authors, providerAuthors] = await Promise.all([
      ForumComment.aggregate([
        { $match: { postId: { $in: postIds }, status: "active" } },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ]),
      User.find({ _id: { $in: authorIds } }).select({ _id: 1, name: 1, email: 1 }).lean().exec(),
      category === "services"
        ? ServiceProvider.find({ userId: { $in: authorIds } })
            .select({ _id: 1, userId: 1, businessName: 1 })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    commentCountMap = new Map(
      commentCounts.map((item) => [String(item._id), Number(item.count) || 0]),
    );
    authorMap = new Map(authors.map((author) => [String(author._id), author]));
    providerAuthorMap = new Map(
      providerAuthors.map((provider) => [
        String(provider.userId),
        typeof provider.businessName === "string" ? provider.businessName : "",
      ]),
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {showStudentOnlyPostingNote ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The forum is currently available to students only. Landlord and admin accounts cannot
          post or comment.
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Categories</h2>
          <div className="mt-3 space-y-1 text-sm">
            {FORUM_CATEGORIES.map((item) => (
              <Link
                key={item}
                href={`/forum/${item}`}
                className={`block rounded px-2 py-1 ${item === category ? "bg-muted font-medium" : ""}`}
              >
                {FORUM_CATEGORY_CONFIG[item].label}
              </Link>
            ))}
          </div>
        </aside>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{FORUM_CATEGORY_CONFIG[categoryKey].label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {FORUM_CATEGORY_CONFIG[categoryKey].description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant={!sortByUpvotes ? "default" : "outline"}>
                <Link href={`/forum/${category}?sort=recent`}>Recent</Link>
              </Button>
              <Button asChild variant={sortByUpvotes ? "default" : "outline"}>
                <Link href={`/forum/${category}?sort=upvotes`}>Most Upvoted</Link>
              </Button>
              {canCreatePost ? (
                <NewPostModal
                  defaultCategory={category}
                  defaultEntityType={entityType}
                  defaultEntityId={entityId}
                />
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {showStudentOnlyAccessNote ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                {STUDENT_ONLY_FORUM_ACCESS_MESSAGE}
              </div>
            ) : sortedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet in this category.</p>
            ) : (
              sortedPosts.map((post) => (
                <article key={String(post._id)} className="rounded-lg border p-4">
                  <Link href={`/forum/post/${String(post._id)}`} className="text-lg font-semibold">
                    {post.title}
                  </Link>
                  {post.entityRef?.id ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Linked: {post.entityRef.type} · {post.entityRef.id}
                    </p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {commentCountMap.get(String(post._id)) || 0} comments ·{" "}
                    {Array.isArray(post.upvotes) ? post.upvotes.length : 0} upvotes ·{" "}
                    {(categoryKey === "services" ? providerAuthorMap.get(String(post.authorId)) : "") ||
                      authorMap.get(String(post.authorId))?.name ||
                      authorMap.get(String(post.authorId))?.email ||
                      "Anonymous"}{" "}
                    · {formatTimeAgo(post.createdAt instanceof Date ? post.createdAt : new Date())}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
