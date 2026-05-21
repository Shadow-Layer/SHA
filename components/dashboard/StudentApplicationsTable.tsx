"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  listingId: string;
  listingTitle: string;
  area: string;
  rent: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
};

type StudentApplicationsTableProps = {
  rows: Row[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

const STATUS_LABELS: Record<Row["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function StudentApplicationsTable({ rows }: StudentApplicationsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No applications submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3">Listing</th>
              <th className="py-2 pr-3">Area</th>
              <th className="py-2 pr-3">Rent</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Submitted</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-3 pr-3">
                  <Link className="underline" href={`/listings/${row.listingId}`}>
                    {row.listingTitle}
                  </Link>
                </td>
                <td className="py-3 pr-3">{row.area}</td>
                <td className="py-3 pr-3">{typeof row.rent === "number" ? `$${row.rent}` : "-"}</td>
                <td className="py-3 pr-3">
                  <span className="rounded-full border px-2 py-1 text-xs">{STATUS_LABELS[row.status]}</span>
                </td>
                <td className="py-3 pr-3">{formatDate(row.createdAt)}</td>
                <td className="py-3 pr-3">
                  {row.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === row.id}
                      onClick={async () => {
                        setError(null);
                        setLoadingId(row.id);
                        try {
                          const response = await fetch(`/api/applications/${row.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "withdraw" }),
                          });
                          const data = (await response.json()) as { error?: string };
                          if (!response.ok) {
                            throw new Error(data.error || "Unable to withdraw");
                          }
                          router.refresh();
                        } catch (withdrawError) {
                          setError(
                            withdrawError instanceof Error ? withdrawError.message : "Unable to withdraw.",
                          );
                        } finally {
                          setLoadingId(null);
                        }
                      }}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                  {row.status === "accepted" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/inbox">Open Chat</Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
