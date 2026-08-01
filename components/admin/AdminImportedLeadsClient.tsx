"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import BulkWhatsAppPdfModal from "@/components/admin/BulkWhatsAppPdfModal";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ContactStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "declined"
  | "unreachable"
  | "invited"
  | "claimed";
type InviteStatus = "imported" | "invited" | "claimed" | "onboarded";
type ListingStatus =
  | "pending_review"
  | "published"
  | "warning"
  | "removed"
  | "imported_draft"
  | "awaiting_landlord_claim"
  | "awaiting_landlord_completion";

type ImportedLeadRow = {
  userId: string;
  name: string;
  phone: string;
  contactStatus: ContactStatus;
  inviteStatus: InviteStatus;
  onboardingCompleted: boolean;
  listing: {
    id: string;
    title: string;
    area: string;
    status: ListingStatus;
    completedByLandlord: boolean;
    photos: string[];
    landmark: string;
    capacity: number | null;
    importNotes: string;
    pricingDisplayText: string;
    amenities: string[];
    tenantPreferences: string[];
    seedConfidence: "low" | "medium" | "high" | null;
    rawImportedText: string;
  } | null;
  latestEvent: {
    type: string;
    notes: string;
    createdAt: string | null;
  } | null;
};

type OutreachEvent = {
  id: string;
  type: string;
  notes: string;
  createdAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  listingId: string | null;
};

type WhatsAppInviteResult = {
  ok: boolean;
  claimUrl: string;
  whatsappUrl: string;
  normalizedPhone: string;
  expiresAt: string;
  messagePreview: string;
};

type WhatsAppModalState = {
  row: ImportedLeadRow;
  loading: boolean;
  error: string | null;
  result: WhatsAppInviteResult | null;
  message: string;
  editingPhone: boolean;
  phoneOverride: string;
};

type FilterTab = "all" | "not_contacted" | "invited" | "claimed" | "completed" | "declined";
type ContactMethod = "call" | "whatsapp" | "in_person";
type ActionStatus = "contacted" | "interested" | "declined" | "unreachable";

const Dialog = DialogPrimitive.Root;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>;
}

function DialogContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg outline-none ${className}`}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

const FILTER_TABS: Array<{ label: string; value: FilterTab }> = [
  { label: "All", value: "all" },
  { label: "Not Contacted", value: "not_contacted" },
  { label: "Invited", value: "invited" },
  { label: "Claimed", value: "claimed" },
  { label: "Completed", value: "completed" },
  { label: "Declined", value: "declined" },
];

const STATUS_OPTIONS: Array<{ label: string; value: ActionStatus }> = [
  { label: "Contacted", value: "contacted" },
  { label: "Interested", value: "interested" },
  { label: "Declined", value: "declined" },
  { label: "Unreachable", value: "unreachable" },
];

const CONTACT_METHOD_OPTIONS: Array<{ label: string; value: ContactMethod }> = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Call", value: "call" },
  { label: "In Person", value: "in_person" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

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

function getBadgeClass(value: string) {
  switch (value) {
    case "not_contacted":
    case "imported":
    case "imported_draft":
      return "bg-slate-100 text-slate-700";
    case "contacted":
    case "awaiting_landlord_claim":
    case "invited":
      return "bg-amber-100 text-amber-700";
    case "interested":
    case "claimed":
    case "awaiting_landlord_completion":
      return "bg-blue-100 text-blue-700";
    case "onboarded":
    case "completed":
    case "published":
      return "bg-emerald-100 text-emerald-700";
    case "declined":
    case "removed":
    case "unreachable":
      return "bg-rose-100 text-rose-700";
    case "bulk_pdf_generated":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getFilterQuery(tab: FilterTab) {
  return tab === "all" ? "" : `?contactStatus=${tab}`;
}

function getDefaultDraft(row: ImportedLeadRow) {
  return {
    contactStatus:
      row.contactStatus === "interested" ||
      row.contactStatus === "declined" ||
      row.contactStatus === "unreachable"
        ? row.contactStatus
        : ("contacted" as ActionStatus),
    contactMethod: "whatsapp" as ContactMethod,
    notes: "",
  };
}

function canSendInvite(row: ImportedLeadRow) {
  return (
    !["claimed", "onboarded"].includes(row.inviteStatus) &&
    ["imported_draft", "awaiting_landlord_claim"].includes(row.listing?.status ?? "")
  );
}

export default function AdminImportedLeadsClient() {
  const [rows, setRows] = useState<ImportedLeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPdfModalOpen, setBulkPdfModalOpen] = useState(false);
  const [bulkSuccessBanner, setBulkSuccessBanner] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ImportedLeadRow | null>(null);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, { contactStatus: ActionStatus; contactMethod: ContactMethod; notes: string }>
  >({});
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [inviteDeliveryById, setInviteDeliveryById] = useState<Record<string, string | null>>({});
  const [whatsappModal, setWhatsappModal] = useState<WhatsAppModalState | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/imported-leads${getFilterQuery(activeTab)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { items?: ImportedLeadRow[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load imported leads.");
      }

      const nextRows = Array.isArray(data.items) ? data.items : [];
      setRows(nextRows);
      setSelectedIds((current) => current.filter((userId) => nextRows.some((row) => row.userId === userId)));
      setSelectedLead((current) =>
        current ? nextRows.find((row) => row.userId === current.userId) ?? null : null,
      );
      setStatusDrafts((current) => {
        const nextDrafts = { ...current };
        for (const row of nextRows) {
          nextDrafts[row.userId] = nextDrafts[row.userId] ?? getDefaultDraft(row);
        }
        return nextDrafts;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load imported leads.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const loadEvents = useCallback(async (userId: string) => {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const response = await fetch(`/api/admin/imported-leads/${userId}/events`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { events?: OutreachEvent[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load event history.");
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (loadError) {
      setEvents([]);
      setEventsError(loadError instanceof Error ? loadError.message : "Unable to load events.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  async function openLead(row: ImportedLeadRow) {
    setSelectedLead(row);
    setEvents([]);
    await loadEvents(row.userId);
  }

  async function runStatusUpdate(
    userId: string,
    payload: {
      contactStatus: ActionStatus;
      contactMethod?: ContactMethod;
      notes?: string;
      archiveListing?: boolean;
    },
  ) {
    setWorkingId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/imported-leads/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update landlord.");
      }

      await loadRows();
      if (selectedLead?.userId === userId) {
        await loadEvents(userId);
      }
      setStatusDrafts((current) => ({
        ...current,
        [userId]: {
          ...getDefaultDraft(
            rows.find((row) => row.userId === userId) ?? {
              userId,
              name: "",
              phone: "",
              contactStatus: "contacted",
              inviteStatus: "imported",
              onboardingCompleted: false,
              listing: null,
              latestEvent: null,
            },
          ),
          notes: "",
        },
      }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update landlord.");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleInvite(row: ImportedLeadRow) {
    setWorkingId(row.userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/imported-leads/${row.userId}/invite`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        inviteUrl?: string;
        delivery?: { email?: string | null };
        error?: string;
      };
      if (!response.ok || !data.inviteUrl) {
        throw new Error(data.error || "Unable to generate invite.");
      }

      setInviteLinks((current) => ({ ...current, [row.userId]: data.inviteUrl || "" }));
      setInviteDeliveryById((current) => ({
        ...current,
        [row.userId]: data.delivery?.email ?? null,
      }));
      await loadRows();
      if (selectedLead?.userId === row.userId) {
        await loadEvents(row.userId);
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invite.");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleCopyInvite(userId: string) {
    const inviteUrl = inviteLinks[userId];
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      setError("Unable to copy invite link.");
    }
  }

  const selectedIdSet = new Set(selectedIds);
  const selectedRows = rows.filter((row) => selectedIdSet.has(row.userId));
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIdSet.has(row.userId));
  const canBulkExport = selectedRows.length > 0;

  function toggleRowSelection(userId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(userId) ? current : [...current, userId];
      }

      return current.filter((id) => id !== userId);
    });
  }

  function toggleAllVisibleSelection(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...rows.map((row) => row.userId)]));
      }

      const visibleIds = new Set(rows.map((row) => row.userId));
      return current.filter((id) => !visibleIds.has(id));
    });
  }

  async function callWhatsAppInviteApi(
    userId: string,
    phoneOverride?: string,
    messageTemplate?: string,
  ): Promise<WhatsAppInviteResult | null> {
    const body: Record<string, string> = {};
    if (phoneOverride) body.phoneOverride = phoneOverride;
    if (messageTemplate) body.messageTemplate = messageTemplate;

    const response = await fetch(`/api/admin/imported-leads/${userId}/whatsapp-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as WhatsAppInviteResult & { error?: string };
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to generate WhatsApp invite.");
    }
    return data;
  }

  async function handleOpenWhatsAppModal(row: ImportedLeadRow) {
    setWhatsappModal({
      row,
      loading: true,
      error: null,
      result: null,
      message: "",
      editingPhone: false,
      phoneOverride: row.phone,
    });

    try {
      const result = await callWhatsAppInviteApi(row.userId);
      setWhatsappModal((prev) =>
        prev ? { ...prev, loading: false, result, message: result?.messagePreview ?? "" } : null,
      );
    } catch (err) {
      setWhatsappModal((prev) =>
        prev
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : "Error" }
          : null,
      );
    }
  }

  async function handleWhatsAppPhoneChange(phoneOverride: string) {
    if (!whatsappModal) return;
    setWhatsappModal((prev) => (prev ? { ...prev, loading: true, error: null } : null));
    try {
      const result = await callWhatsAppInviteApi(whatsappModal.row.userId, phoneOverride);
      setWhatsappModal((prev) =>
        prev ? { ...prev, loading: false, result, message: result?.messagePreview ?? "" } : null,
      );
    } catch (err) {
      setWhatsappModal((prev) =>
        prev
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : "Error" }
          : null,
      );
    }
  }

  function handleOpenWhatsApp() {
    if (!whatsappModal?.result) return;
    const { claimUrl, normalizedPhone } = whatsappModal.result;
    const { row } = whatsappModal;
    const currentMessage = whatsappModal.message;
    const finalMessage = currentMessage.includes(claimUrl)
      ? currentMessage
      : currentMessage.trimEnd() + "\n\n" + claimUrl;
    const waResult = buildWhatsAppLink(normalizedPhone || row.phone, finalMessage);
    if (!waResult) {
      setError("Unable to build WhatsApp link.");
      return;
    }

    window.open(waResult.whatsappUrl, "_blank");
    // optimistic row update — no full reload
    setRows((prev) =>
      prev.map((r) =>
        r.userId === row.userId
          ? {
              ...r,
              latestEvent: {
                type: "whatsapp_invite",
                notes: "",
                createdAt: new Date().toISOString(),
              },
            }
          : r,
      ),
    );
    setWhatsappModal(null);
  }

  function renderInviteDeliveryBadge(delivery: string | null) {
    switch (delivery) {
      case "sent":
        return <span className="text-xs text-emerald-700">Email sent ✓</span>;
      case "skipped":
        return <span className="text-xs text-amber-700">No email on file — copy link manually</span>;
      case "not_configured":
        return <span className="text-xs text-amber-700">Not configured — copy link manually</span>;
      case "failed":
        return <span className="text-xs text-red-600">Email delivery failed — copy link manually</span>;
      default:
        return null;
    }
  }

  function handleBulkPdfGenerated(result: { batchId: string; count: number; skipped: number }) {
    setBulkSuccessBanner(
      `Generated WhatsApp PDF for ${result.count} landlord(s). ${result.skipped} skipped due to invalid phone numbers. Batch ID: ${result.batchId}`,
    );
    setSelectedIds([]);
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={activeTab === tab.value ? "default" : "outline"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {bulkSuccessBanner ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {bulkSuccessBanner}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {selectedRows.length > 0
            ? `${selectedRows.length} selected`
            : "Select imported leads to export a WhatsApp PDF."}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canBulkExport}
            onClick={() => setBulkPdfModalOpen(true)}
          >
            Export WhatsApp PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canBulkExport}
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">
                <input
                  aria-label="Select all visible imported leads"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAllVisibleSelection(event.target.checked)}
                />
              </th>
              <th className="py-2 pr-4">Owner Name + Phone</th>
              <th className="py-2 pr-4">Property / Area</th>
              <th className="py-2 pr-4">Outreach Status</th>
              <th className="py-2 pr-4">Claim Status</th>
              <th className="py-2 pr-4">Listing Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = statusDrafts[row.userId] ?? getDefaultDraft(row);
              const inviteUrl = inviteLinks[row.userId];
              const inviteDelivery = inviteDeliveryById[row.userId] ?? null;
              const inviteAllowed = canSendInvite(row);
              const phoneCheck = buildWhatsAppLink(row.phone, "test");
              const hasValidPhone = Boolean(phoneCheck);
              const whatsappDisabledReason = !row.phone
                ? "No phone number on file — WhatsApp unavailable"
                : !hasValidPhone
                  ? "Invalid phone number"
                : row.inviteStatus === "claimed" || row.inviteStatus === "onboarded"
                  ? "Landlord has already claimed their account"
                  : "WhatsApp unavailable";

              return (
                <tr key={row.userId} className="border-b align-top">
                  <td className="py-3 pr-4 align-top">
                    <input
                      aria-label={`Select ${row.name}`}
                      type="checkbox"
                      checked={selectedIdSet.has(row.userId)}
                      onChange={(event) => toggleRowSelection(row.userId, event.target.checked)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-muted-foreground">{row.phone || "-"}</p>
                      {row.phone && !hasValidPhone ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                          Invalid phone
                        </span>
                      ) : null}
                      {!row.phone ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                          No phone
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.listing?.title || "No linked listing"}</p>
                    <p className="text-muted-foreground">{row.listing?.area || "-"}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getBadgeClass(row.contactStatus)}`}
                    >
                      {formatLabel(row.contactStatus)}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Latest: {row.latestEvent ? formatLabel(row.latestEvent.type) : "No outreach yet"}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getBadgeClass(row.inviteStatus)}`}
                    >
                      {formatLabel(row.inviteStatus)}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.onboardingCompleted ? "Onboarding complete" : "Awaiting landlord action"}
                    </p>
                    {row.latestEvent?.type === "whatsapp_invite" ? (
                      <p className="mt-1 text-xs text-green-600">WhatsApp link generated</p>
                    ) : null}
                    {row.latestEvent?.type === "bulk_pdf_generated" ? (
                      <p className="mt-1 text-xs text-indigo-600">Bulk WhatsApp PDF generated</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getBadgeClass(row.listing?.status || "unknown")}`}
                    >
                      {formatLabel(row.listing?.status || "unknown")}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.listing ? `${row.listing.photos.length} photo(s)` : "No listing"}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void openLead(row)}>
                          View
                        </Button>
                        {inviteAllowed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canSendInvite(row) || workingId === row.userId || !row.listing}
                            onClick={() => void handleInvite(row)}
                            title="Send or resend an invite while the landlord has not claimed the listing."
                          >
                            {row.inviteStatus === "invited" ? "Resend Invite" : "Send Invite"}
                          </Button>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
                            title={
                              row.listing
                                ? "Invites are only available before claim or onboarding."
                                : "A linked listing is required before sending an invite."
                            }
                          >
                            {row.inviteStatus === "claimed" || row.inviteStatus === "onboarded"
                              ? "Claimed - No invite needed"
                              : "Invite unavailable"}
                          </span>
                        )}
                        {canSendInvite(row) && hasValidPhone ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            disabled={workingId === row.userId}
                            onClick={() => void handleOpenWhatsAppModal(row)}
                          >
                            Send via WhatsApp
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            title={whatsappDisabledReason}
                          >
                            Send via WhatsApp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.userId || !row.listing}
                          onClick={() =>
                            void runStatusUpdate(row.userId, {
                              contactStatus: "declined",
                              notes: draft.notes || "Archived by admin",
                              archiveListing: true,
                            })
                          }
                        >
                          Archive
                        </Button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[minmax(0,150px)_minmax(0,150px)_minmax(0,1fr)_auto]">
                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={draft.contactStatus}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [row.userId]: {
                                ...draft,
                                contactStatus: event.target.value as ActionStatus,
                              },
                            }))
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={draft.contactMethod}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [row.userId]: {
                                ...draft,
                                contactMethod: event.target.value as ContactMethod,
                              },
                            }))
                          }
                        >
                          {CONTACT_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Optional notes"
                          value={draft.notes}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [row.userId]: {
                                ...draft,
                                notes: event.target.value,
                              },
                            }))
                          }
                        />

                        <Button
                          size="sm"
                          disabled={workingId === row.userId}
                          onClick={() =>
                            void runStatusUpdate(row.userId, {
                              contactStatus: draft.contactStatus,
                              contactMethod: draft.contactMethod,
                              notes: draft.notes,
                            })
                          }
                        >
                          Mark Status
                        </Button>
                      </div>

                      {inviteUrl ? (
                        <div className="space-y-2 rounded-md border bg-background px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              className="min-w-[320px] flex-1 bg-transparent text-xs outline-none"
                              readOnly
                              value={inviteUrl}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopyInvite(row.userId)}
                            >
                              Copy
                            </Button>
                          </div>
                          {renderInviteDeliveryBadge(inviteDelivery)}
                        </div>
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
        <p className="mt-4 text-sm text-muted-foreground">No imported leads in this view.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading...</p> : null}

      <Sheet
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null);
            setEvents([]);
            setEventsError(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedLead ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>
                  {selectedLead.phone || "No phone"} · {selectedLead.listing?.area || "Unknown area"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="rounded-lg border p-4">
                  <h2 className="text-sm font-semibold">Imported Record</h2>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Title</dt>
                      <dd className="text-right font-medium">
                        {selectedLead.listing?.title || "No linked listing"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Area</dt>
                      <dd className="text-right">{selectedLead.listing?.area || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Landmark / Address</dt>
                      <dd className="text-right">{selectedLead.listing?.landmark || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Capacity</dt>
                      <dd className="text-right">{selectedLead.listing?.capacity ?? "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Amenities</dt>
                      <dd className="text-right">
                        {selectedLead.listing?.amenities.length
                          ? selectedLead.listing.amenities.join(", ")
                          : "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Tenant Preferences</dt>
                      <dd className="text-right">
                        {selectedLead.listing?.tenantPreferences.length
                          ? selectedLead.listing.tenantPreferences.join(", ")
                          : "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Utilities</dt>
                      <dd className="max-w-sm text-right">{selectedLead.listing?.importNotes || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Pricing</dt>
                      <dd className="text-right">{selectedLead.listing?.pricingDisplayText || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Seed Confidence</dt>
                      <dd className="text-right">{selectedLead.listing?.seedConfidence || "-"}</dd>
                    </div>
                  </dl>

                  {selectedLead.listing?.rawImportedText ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Raw Import Payload
                      </h3>
                      <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                        {selectedLead.listing.rawImportedText}
                      </pre>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border p-4">
                  <h2 className="text-sm font-semibold">Outreach History</h2>
                  {eventsError ? <p className="mt-3 text-sm text-red-600">{eventsError}</p> : null}
                  {eventsLoading ? (
                    <p className="mt-3 text-sm text-muted-foreground">Loading events...</p>
                  ) : null}
                  {!eventsLoading && events.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No outreach events recorded yet.</p>
                  ) : null}
                  <div className="mt-3 space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="rounded-md border px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getBadgeClass(event.type)}`}
                          >
                            {formatLabel(event.type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{event.notes || "No notes provided."}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Logged by {event.createdByName || "Unknown admin"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(whatsappModal)}
        onOpenChange={(open) => {
          if (!open) setWhatsappModal(null);
        }}
      >
        <DialogContent className="w-full max-w-lg rounded-xl p-6">
          {whatsappModal ? (
            <>
              <DialogHeader>
                <DialogTitle>Send via WhatsApp</DialogTitle>
                <DialogDescription>
                  {whatsappModal.row.name} · {whatsappModal.row.listing?.title || "No listing"}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex items-center gap-3">
                {whatsappModal.editingPhone ? (
                  <input
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    value={whatsappModal.phoneOverride}
                    onChange={(e) =>
                      setWhatsappModal((prev) =>
                        prev ? { ...prev, phoneOverride: e.target.value } : null,
                      )
                    }
                    onBlur={() => void handleWhatsAppPhoneChange(whatsappModal.phoneOverride)}
                    placeholder="+263771234567"
                  />
                ) : (
                  <span className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                    {whatsappModal.result?.normalizedPhone || whatsappModal.row.phone || "No phone"}
                  </span>
                )}
                <button
                  className="text-xs text-blue-500 underline"
                  onClick={() =>
                    setWhatsappModal((prev) =>
                      prev ? { ...prev, editingPhone: !prev.editingPhone } : null,
                    )
                  }
                >
                  {whatsappModal.editingPhone ? "Done" : "Edit phone"}
                </button>
              </div>

              {whatsappModal.loading ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  Generating secure link…
                </div>
              ) : whatsappModal.error ? (
                <p className="mt-4 text-sm text-red-600">{whatsappModal.error}</p>
              ) : whatsappModal.result ? (
                <>
                  <div className="mt-4">
                    <label className="text-sm font-medium">Message</label>
                    <textarea
                      className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
                      rows={7}
                      value={whatsappModal.message}
                      onChange={(e) =>
                        setWhatsappModal((prev) =>
                          prev ? { ...prev, message: e.target.value } : null,
                        )
                      }
                    />
                    <p
                      className={`mt-1 text-right text-xs ${
                        whatsappModal.message.length > 1000
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {whatsappModal.message.length} / 1000 characters
                      {whatsappModal.message.length > 1000 ? " — message is long" : ""}
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Claim link (auto-appended)
                    </p>
                    <div className="mt-1 break-all rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      {whatsappModal.result.claimUrl}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    ⏱ Link expires{" "}
                    {new Date(whatsappModal.result.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={handleOpenWhatsApp}
                    >
                      Open WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const claimUrl = whatsappModal.result!.claimUrl;
                        const msg = whatsappModal.message;
                        const textToCopy = msg.includes(claimUrl)
                          ? msg
                          : msg.trimEnd() + "\n\n" + claimUrl;
                        void navigator.clipboard.writeText(textToCopy);
                      }}
                    >
                      Copy message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void navigator.clipboard.writeText(whatsappModal.result!.claimUrl)}
                    >
                      Copy claim link
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWhatsappModal(null)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <BulkWhatsAppPdfModal
        open={bulkPdfModalOpen}
        onOpenChange={setBulkPdfModalOpen}
        rows={selectedRows.map((row) => ({
          userId: row.userId,
          name: row.name,
          phone: row.phone,
          listing: row.listing
            ? {
                title: row.listing.title,
                area: row.listing.area,
              }
            : null,
        }))}
        onGenerated={handleBulkPdfGenerated}
      />
    </section>
  );
}
