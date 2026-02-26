"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ListingOccupancyOption } from "@/lib/listings";

const OCCUPANCY_LABELS: Record<string, string> = {
  per_head_double: "Per head (double)",
  per_head_triple_plus: "Per head (triple+)",
  per_room: "Per room",
  full_house: "Full house",
  custom: "Custom",
};

type ApplyPanelProps = {
  listingId: string;
  isAuthenticated: boolean;
  loginHref: string;
  occupancyOptions: ListingOccupancyOption[];
  applicationStatus?: "pending" | "accepted" | "rejected" | "withdrawn" | null;
};

export default function ApplyPanel({
  listingId,
  isAuthenticated,
  loginHref,
  occupancyOptions,
  applicationStatus = null,
}: ApplyPanelProps) {
  const [notice, setNotice] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Apply to this listing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to submit your move-in date, occupancy preference, and message to the landlord.
        </p>
        <Button asChild className="mt-4">
          <Link href={loginHref}>Log in to apply</Link>
        </Button>
      </section>
    );
  }

  if (applicationStatus) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Application status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Current status:{" "}
          <span className="font-medium capitalize text-foreground">{applicationStatus}</span>
        </p>
        {applicationStatus === "pending" ? (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setNotice("Withdrawals will be available once the apply API is live.")}
          >
            Withdraw application
          </Button>
        ) : null}
        {notice ? <p className="mt-3 text-xs text-muted-foreground">{notice}</p> : null}
      </section>
    );
  }

  const sortedOptions = occupancyOptions.length
    ? occupancyOptions
    : [{ type: "custom", rentAmount: null, description: null }];

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Apply to this listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Share your move-in date and preferences. Landlords will review and respond in-app.
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice("Application submissions will be enabled once T6 is complete.");
        }}
      >
        <label className="block text-sm font-medium">
          Move-in date
          <input
            type="date"
            name="moveInDate"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium">
          Occupancy preference
          <select
            name="occupancyPreference"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select occupancy type
            </option>
            {sortedOptions.map((option, index) => {
              const label = OCCUPANCY_LABELS[option.type] ?? "Custom";
              return (
                <option key={`${listingId}-${index}`} value={option.type}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Message to landlord
          <textarea
            name="message"
            rows={4}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Introduce yourself and share any relevant notes."
          />
        </label>

        <Button type="submit">Submit application</Button>
        {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
      </form>
    </section>
  );
}
