"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ListingStatus = "pending_review" | "published" | "warning" | "removed";

type ListingRow = {
  id: string;
  title: string;
  area: string;
  status: ListingStatus;
  landlordName: string;
  submittedAt: string;
  source: "pdf_import" | "landlord_created" | "admin_created";
  photoCount: number;
  landlordConsentConfirmed: boolean;
};

const STATUS_TABS: Array<{ label: string; value: ListingStatus }> = [
  { label: "Pending Review", value: "pending_review" },
  { label: "Published", value: "published" },
  { label: "Warning", value: "warning" },
  { label: "Removed", value: "removed" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function AdminListingsClient() {
  const router = useRouter();
  const [status, setStatus] = useState<ListingStatus>("pending_review");
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadRows = useCallback(async (nextStatus: ListingStatus) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/listings?status=${nextStatus}`, { cache: "no-store" });
      const data = (await response.json()) as { listings?: ListingRow[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load listings");
      }

      setRows(Array.isArray(data.listings) ? data.listings : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows(status);
  }, [loadRows, status]);

  async function runAction(listingId: string, action: "approve" | "reject") {
    setWorkingId(listingId);
    setError(null);

    try {
      const note =
        action === "reject" ? window.prompt("Optional rejection note for landlord", "") || "" : "";

      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update listing");
      }

      await loadRows(status);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update listing.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? "default" : "outline"}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Listing</th>
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Landlord</th>
              <th className="py-2 pr-4">Submitted</th>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2 pr-4">Photos</th>
              <th className="py-2 pr-4">Consent</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b align-top">
                <td className="py-3 pr-4 font-medium">
                  <Link className="underline" href={`/listings/${row.id}`} target="_blank" rel="noreferrer">
                    {row.title}
                  </Link>
                </td>
                <td className="py-3 pr-4">{row.area}</td>
                <td className="py-3 pr-4">{row.landlordName}</td>
                <td className="py-3 pr-4">{formatDate(row.submittedAt)}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      row.source === "pdf_import"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.source === "pdf_import" ? "PDF Import" : "Self-registered"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {row.photoCount === 0 ? (
                    <span className="font-medium text-amber-700">⚠️ None</span>
                  ) : (
                    <span>{row.photoCount}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {row.landlordConsentConfirmed ? (
                    <span className="font-medium text-green-700">✅ Confirmed</span>
                  ) : (
                    <span className="font-medium text-amber-700">⚠️ Missing</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {status === "pending_review" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={workingId === row.id}
                        onClick={() => void runAction(row.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={workingId === row.id}
                        onClick={() => void runAction(row.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No actions</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No listings in this queue.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading...</p> : null}
    </section>
  );
}
