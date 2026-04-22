"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type ImportResult = {
  batchId: string;
  total: number;
  successful: number;
  skipped?: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
};

const SAMPLE_JSON = `[
  {
    "ownerName": "Jane Doe",
    "phone": "+263771234567",
    "address": "12 Josiah Tongogara Ave",
    "area": "Belvedere",
    "capacity": 8,
    "utilities": "Wi-Fi, borehole, solar backup, parking",
    "genderPreference": "Female",
    "rentalCharges": "$180/month"
  }
]`;

export default function AdminImportClient() {
  const [value, setValue] = useState(SAMPLE_JSON);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Paste a JSON array of import rows.");
      }

      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed, sourceFileName: "pasted-json" }),
      });
      const data = (await response.json()) as ImportResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to import rows.");
      }

      setResult({
        batchId: data.batchId,
        total: data.total,
        successful: data.successful,
        skipped: data.skipped,
        failed: data.failed,
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to import rows.");
    } finally {
      setLoading(false);
    }
  }

  const skipped = result?.skipped ?? (result ? Math.max(result.total - result.successful - result.failed, 0) : 0);

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium" htmlFor="import-json">
            Import rows JSON
          </label>
          <textarea
            id="import-json"
            className="mt-2 min-h-[320px] w-full rounded-lg border bg-background px-3 py-3 font-mono text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Importing..." : "Run Import"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setValue(SAMPLE_JSON)}>
            Load Sample
          </Button>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-6 rounded-lg border bg-background p-4">
          <p className="text-sm font-medium">
            {result.successful} imported, {skipped} skipped (duplicates), {result.failed} failed
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Batch ID: {result.batchId}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/admin/imported-leads">View Imported Leads</Link>
            </Button>
          </div>

          {result.errors.length > 0 ? (
            <div className="mt-4">
              <h2 className="text-sm font-medium">Row notes</h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {result.errors.map((item) => (
                  <li key={`${item.row}-${item.reason}`} className="rounded-md border px-3 py-2">
                    Row {item.row + 1}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
