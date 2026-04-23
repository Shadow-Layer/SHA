"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FORUM_CATEGORIES, FORUM_CATEGORY_CONFIG } from "@/lib/forum";

type NewPostModalProps = {
  defaultCategory: string;
  defaultEntityType?: string;
  defaultEntityId?: string;
};

export default function NewPostModal({
  defaultCategory,
  defaultEntityType,
  defaultEntityId,
}: NewPostModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(defaultCategory);
  const [entityType, setEntityType] = useState(defaultEntityType || "listing");
  const [entityId, setEntityId] = useState(defaultEntityId || "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button type="button" onClick={() => setOpen((prev) => !prev)}>
        {open ? "Close" : "New Post"}
      </Button>

      {open ? (
        <form
          className="mt-4 space-y-4 rounded-lg border p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setIsSubmitting(true);
            try {
              const payload: Record<string, unknown> = {
                category,
                title,
                body,
              };
              if (entityId.trim()) {
                payload.entityRef = { type: entityType, id: entityId.trim() };
              }

              const response = await fetch("/api/forum/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(data.error || "Unable to create post");
              }

              setOpen(false);
              setTitle("");
              setBody("");
              router.refresh();
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Unable to create post.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label className="block text-sm font-medium">
            Category
            <select
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {FORUM_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {FORUM_CATEGORY_CONFIG[item].label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Entity type
              <select
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
              >
                <option value="listing">Listing</option>
                <option value="landlord">Landlord</option>
                <option value="location">Location</option>
                <option value="amenity">Amenity</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Entity ID / label
              <input
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Title
            <input
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Body
            <textarea
              rows={5}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
            />
          </label>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
