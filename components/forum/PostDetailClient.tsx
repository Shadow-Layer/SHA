"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { STUDENT_ONLY_FORUM_ACCESS_MESSAGE } from "@/lib/forum-shared";

type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type PostDetailClientProps = {
  postId: string;
  category: string;
  comments: Comment[];
  upvoteCount: number;
  canUpvote: boolean;
  canComment: boolean;
  canRespondAsProvider: boolean;
  providerCommentPrefix: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function PostDetailClient({
  postId,
  category,
  comments,
  upvoteCount,
  canUpvote,
  canComment,
  canRespondAsProvider,
  providerCommentPrefix,
}: PostDetailClientProps) {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitComment() {
    if (!newComment.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(STUDENT_ONLY_FORUM_ACCESS_MESSAGE);
        }
        throw new Error(data.error || "Unable to add comment");
      }
      setNewComment("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add comment.");
    } finally {
      setLoading(false);
    }
  }

  async function upvote() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/forum/posts/${postId}/upvote`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(STUDENT_ONLY_FORUM_ACCESS_MESSAGE);
        }
        throw new Error(data.error || "Unable to upvote");
      }
      router.refresh();
    } catch (upvoteError) {
      setError(upvoteError instanceof Error ? upvoteError.message : "Unable to upvote.");
    } finally {
      setLoading(false);
    }
  }

  async function report(targetType: "post" | "comment", targetId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: "Reported from forum UI" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to report");
      }
      router.refresh();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Unable to report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        {canUpvote ? (
          <Button type="button" variant="outline" disabled={loading} onClick={() => void upvote()}>
            Upvote ({upvoteCount})
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void report("post", postId)}
        >
          Report
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <h2 className="text-lg font-semibold">Comments</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-md border p-3 text-sm">
              <p>{comment.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {comment.authorName} · {formatDate(comment.createdAt)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                disabled={loading}
                onClick={() => void report("comment", comment.id)}
              >
                Report
              </Button>
            </article>
          ))
        )}
      </div>

      {canRespondAsProvider ? (
        <Button
          type="button"
          className="mt-5"
          variant="outline"
          onClick={() =>
            setNewComment((current) =>
              current.startsWith(providerCommentPrefix)
                ? current
                : `${providerCommentPrefix}${current}`,
            )
          }
        >
          Respond as Provider
        </Button>
      ) : null}

      {canComment ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitComment();
          }}
        >
          <label className="block text-sm font-medium">
            {canRespondAsProvider ? "Response" : "Add comment"}
            <textarea
              rows={3}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={loading || !newComment.trim()}>
            {canRespondAsProvider ? "Post response" : "Comment"}
          </Button>
        </form>
      ) : category === "services" ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Only students and service providers can reply in this thread.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
