"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ForumPostSummary } from "@/lib/forum-shared";

export type ListingReview = {
  id: string;
  rating: number;
  text: string;
  stayPeriod?: string | null;
};

type ListingTabsProps = {
  reviews: ListingReview[];
  discussions: ForumPostSummary[];
  discussionLink: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ListingTabs({
  reviews,
  discussions,
  discussionLink,
}: ListingTabsProps) {
  const [activeTab, setActiveTab] = useState<"reviews" | "discussions">("reviews");

  const reviewSummary = useMemo(() => {
    if (!reviews.length) {
      return "No reviews yet. Be the first to review after your stay.";
    }
    return `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;
  }, [reviews]);

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeTab === "reviews" ? "default" : "outline"}
            onClick={() => setActiveTab("reviews")}
          >
            Reviews
          </Button>
          <Button
            type="button"
            variant={activeTab === "discussions" ? "default" : "outline"}
            onClick={() => setActiveTab("discussions")}
          >
            Discussions
          </Button>
        </div>
        {activeTab === "discussions" ? (
          <Button asChild>
            <Link href={discussionLink}>Start a Discussion</Link>
          </Button>
        ) : null}
      </div>

      {activeTab === "reviews" ? (
        <div className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{reviewSummary}</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">★ {review.rating.toFixed(1)}</span>
                  {review.stayPeriod ? (
                    <span className="text-muted-foreground">{review.stayPeriod}</span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{review.text}</p>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {discussions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No discussions yet. Start the first conversation for this listing.
            </p>
          ) : (
            discussions.map((post) => (
              <article key={post.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{post.title}</h3>
                  <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{post.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {post.upvoteCount} upvote{post.upvoteCount === 1 ? "" : "s"}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
