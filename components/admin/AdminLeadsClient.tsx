"use client";

import { useEffect, useState } from "react";

type LeadStatus = "new" | "reviewed" | "converted";

type LeadRow = {
  id: string;
  title: string;
  area: string;
  landmark: string;
  contactHint: string;
  notes: string;
  submitterEmail: string;
  status: LeadStatus;
  submittedAt: string;
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
  }).format(date);
}

function getStatusBadgeClass(status: LeadStatus) {
  if (status === "new") {
    return "bg-blue-100 text-blue-700";
  }
  if (status === "reviewed") {
    return "bg-green-100 text-green-700";
  }

  return "bg-muted text-muted-foreground";
}

export default function AdminLeadsClient() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/leads", { cache: "no-store" });
        const data = (await response.json()) as { leads?: LeadRow[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Unable to load leads");
        }

        if (!cancelled) {
          setRows(Array.isArray(data.leads) ? data.leads : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load leads.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Landmark</th>
              <th className="py-2 pr-4">Contact Hint</th>
              <th className="py-2 pr-4">Notes</th>
              <th className="py-2 pr-4">Submitter Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Submitted date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b align-top">
                <td className="py-3 pr-4 font-medium">{row.title}</td>
                <td className="py-3 pr-4">{row.area}</td>
                <td className="py-3 pr-4">{row.landmark || "-"}</td>
                <td className="py-3 pr-4">{row.contactHint || "-"}</td>
                <td className="py-3 pr-4">{row.notes || "-"}</td>
                <td className="py-3 pr-4">{row.submitterEmail || "-"}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="py-3 pr-4">{formatDate(row.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No housing leads submitted yet.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading...</p> : null}
    </section>
  );
}
