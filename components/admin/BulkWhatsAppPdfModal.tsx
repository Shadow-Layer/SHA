"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const DEFAULT_MESSAGE_TEMPLATE =
  "Hello {landlordName}, this is Student Housing Archive. We imported your rental listing details so students can find verified housing more easily. Please claim your landlord account and complete your listing using the secure link below:\n\n{claimLink}\n\nIf you did not expect this message, you can ignore it.";

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
  onGenerated: (result: { batchId: string; count: number; skipped: number }) => void;
};

function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>;
}

function DialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg outline-none">
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export default function BulkWhatsAppPdfModal({ open, rows, onOpenChange, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setMessageTemplate(DEFAULT_MESSAGE_TEMPLATE);
    }
  }, [open]);

  const validRows = rows.filter((row) => buildWhatsAppLink(row.phone, "test") !== null);
  const invalidCount = rows.length - validRows.length;
  const previewMessage =
    validRows.length > 0
      ? messageTemplate
          .replace(/\{landlordName\}/g, validRows[0]?.name ?? "")
          .replace(/\{claimLink\}/g, "[claim link will be generated]")
      : "";

  async function handleGeneratePdf() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/imported-leads/whatsapp-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: rows.map((row) => row.userId),
          messageTemplate,
          baseUrl: "https://studenthousingarchive.cfd",
        }),
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
        skipped: invalidCount,
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

        <div className="mt-4 space-y-4">
          <div className="max-h-48 overflow-auto rounded-lg border bg-muted/30 p-3">
            <ul className="space-y-2 text-sm">
              {rows.map((row) => {
                const isValid = buildWhatsAppLink(row.phone, "test") !== null;

                return (
                  <li key={row.userId} className="rounded-md border bg-background px-3 py-2">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.phone || "No phone"} · {row.listing?.title || "No listing"}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        isValid ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {isValid ? "Valid phone" : "Invalid or missing phone"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-3">
              <div>
                <label htmlFor="bulk-whatsapp-template" className="text-sm font-medium">
                  Message Template
                </label>
                <textarea
                  id="bulk-whatsapp-template"
                  className="mt-1.5 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
                  rows={10}
                  value={messageTemplate}
                  onChange={(event) => setMessageTemplate(event.target.value)}
                />
                <p
                  className={`mt-1 text-right text-xs ${
                    messageTemplate.length > 1000 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                >
                  {messageTemplate.length} / 1000 characters
                </p>
              </div>

              {invalidCount > 0 ? (
                <p className="text-sm text-amber-700">
                  ⚠ {invalidCount} landlord(s) will be skipped (invalid or missing phone). PDF will
                  include {validRows.length} valid entries.
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">Live Preview</p>
              <div className="rounded-md border bg-background p-3 text-sm text-foreground">
                {validRows.length > 0 ? (
                  <div className="whitespace-pre-wrap">{previewMessage}</div>
                ) : (
                  <p className="text-muted-foreground">
                    No valid phone numbers available for preview.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {validRows.length > 0
                  ? "Preview uses the first valid phone row's name and a generated claim link placeholder."
                  : "Valid phone numbers are required to generate a PDF."}
              </p>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleGeneratePdf()} disabled={loading || validRows.length === 0}>
            {loading ? "Generating..." : `Generate PDF (${validRows.length} valid)`}
          </Button>
        </div>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
