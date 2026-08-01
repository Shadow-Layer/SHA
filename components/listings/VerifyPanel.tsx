"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type VerifyPanelProps = {
  listingId: string;
  isAuthenticated: boolean;
  loginHref: string;
  existingVerification?: "stayed" | "seen" | "suspicious" | null;
};

const verificationLabels: Record<string, string> = {
  stayed: "I've stayed here",
  seen: "I've seen this place",
  suspicious: "This looks suspicious",
};

export default function VerifyPanel({
  listingId,
  isAuthenticated,
  loginHref,
  existingVerification = null,
}: VerifyPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<"stayed" | "seen" | "suspicious" | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Verify this listing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm the listing’s legitimacy by sharing your experience.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={loginHref}>Log in to verify</Link>
        </Button>
      </section>
    );
  }

  if (existingVerification) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Verification submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You’ve already verified this listing:{" "}
          <span className="font-medium text-foreground">
            {verificationLabels[existingVerification]}
          </span>
          .
        </p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p>Thanks for your feedback.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Verify this listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your verification helps highlight trusted student housing.
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!selected) return;
          setSubmitting(true);
          setError(null);
          try {
            const res = await fetch(`/api/listings/${listingId}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: selected, note: note || undefined }),
            });
            const data = await res.json();
            if (res.status === 409) {
              setError("You've already verified this listing.");
            } else if (!res.ok) {
              throw new Error(data.error || "Unable to submit verification");
            } else {
              setDone(true);
              router.refresh();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to submit verification");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="flex flex-col gap-3">
          {(["stayed", "seen", "suspicious"] as const).map((value) => (
            <label
              key={`${listingId}-${value}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="verificationType"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
              />
              {verificationLabels[value]}
            </label>
          ))}
        </div>

        {selected === "suspicious" ? (
          <label className="block text-sm font-medium">
            Optional note
            <textarea
              name="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Share why this listing seems suspicious."
            />
          </label>
        ) : null}

        <Button type="submit" variant="outline" disabled={submitting || done || !selected}>
          Submit verification
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </section>
  );
}
