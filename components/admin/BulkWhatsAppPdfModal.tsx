"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";

type BulkLead = {
  userId: string;
  name: string;
  phone: string;
  listing: {
    title: string;
    area: string;
  } | null;
};

type Props = {
  open: boolean;
  rows: BulkLead[];
  onOpenChange: (open: boolean) => void;
  onGenerated: (result: { batchId: string; count: number }) => void;
};

function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>;
}

function DialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg outline-none">
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export default function BulkWhatsAppPdfModal({ open, rows, onOpenChange, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
    }
  }, [open]);

  async function handleGeneratePdf() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/imported-leads/whatsapp-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: rows.map((row) => row.userId) }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          debug?: string[];
        };
        console.error("[whatsapp-pdf] export failed", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          debug: data.debug,
        });
        if (data.debug?.length) {
          console.error("[whatsapp-pdf] backend trace", data.debug);
        }
        throw new Error(data.error || "Unable to generate bulk WhatsApp PDF.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      link.download = filenameMatch?.[1] || "sha-whatsapp-pdf.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      onGenerated({
        batchId: response.headers.get("x-batch-id") || "unknown",
        count: Number.parseInt(response.headers.get("x-export-count") || `${rows.length}`, 10),
      });
      onOpenChange(false);
    } catch (generateError) {
      console.error("[whatsapp-pdf] client error", generateError);
      setError(
        generateError instanceof Error ? generateError.message : "Unable to generate PDF.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogPrimitive.Title className="text-lg font-semibold">
            Export WhatsApp PDF
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            Generate a downloadable PDF for {rows.length} selected imported landlord
            {rows.length === 1 ? "" : "s"}.
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="mt-4 max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3">
          <ul className="space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.userId} className="rounded-md border bg-background px-3 py-2">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.phone || "No phone"} · {row.listing?.title || "No listing"}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleGeneratePdf()} disabled={loading || rows.length === 0}>
            {loading ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
