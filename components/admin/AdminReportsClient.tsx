"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ReportRow = {
  id: string;
  targetType: "listing" | "post" | "comment";
  targetId: string;
  targetPreview: string;
  targetStatus: string;
  reporterName: string;
  reason: string;
  status: "pending" | "resolved";
  createdAt: string;
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

export default function AdminReportsClient() {
  const router = useRouter();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/reports?status=pending", { cache: "no-store" });
      const data = (await response.json()) as { reports?: ReportRow[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load reports");
      }

      setRows(Array.isArray(data.reports) ? data.reports : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  async function runAction(reportId: string, action: "resolve" | "remove_target" | "clear_warning") {
    setWorkingId(reportId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update report");
      }

      await loadRows();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update report.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Preview</th>
              <th className="py-2 pr-4">Reporter</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const canClearWarning = row.targetType === "listing" && row.targetStatus === "warning";

              return (
                <tr key={row.id} className="border-b align-top">
                  <td className="py-3 pr-4 capitalize">{row.targetType}</td>
                  <td className="py-3 pr-4">
                    <p className="max-w-[360px] truncate">{row.targetPreview}</p>
                    <p className="text-xs text-muted-foreground">Status: {row.targetStatus}</p>
                  </td>
                  <td className="py-3 pr-4">{row.reporterName}</td>
                  <td className="py-3 pr-4">{row.reason}</td>
                  <td className="py-3 pr-4">{formatDate(row.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={workingId === row.id}
                        onClick={() => void runAction(row.id, "resolve")}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={workingId === row.id}
                        onClick={() => void runAction(row.id, "remove_target")}
                      >
                        Remove target
                      </Button>
                      {canClearWarning ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void runAction(row.id, "clear_warning")}
                        >
                          Clear Warning
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No pending reports.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading...</p> : null}
    </section>
  );
}
