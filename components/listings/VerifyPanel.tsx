"use client";

import { useState } from "react";
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
  const [selected, setSelected] = useState<"stayed" | "seen" | "suspicious" | "">("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

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

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Verify this listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your verification helps highlight trusted student housing.
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice("Verification submissions will be enabled once T7 is complete.");
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

        <Button type="submit" variant="outline" disabled={!selected}>
          Submit verification
        </Button>
        {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
      </form>
    </section>
  );
}
