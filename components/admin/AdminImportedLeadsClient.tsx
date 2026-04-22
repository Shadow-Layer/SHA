"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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

type FilterTab = "all" | "not_contacted" | "invited" | "claimed" | "completed" | "declined";
type ContactMethod = "call" | "whatsapp" | "in_person";
type ActionStatus = "contacted" | "interested" | "declined" | "unreachable";

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
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ImportedLeadRow | null>(null);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, { contactStatus: ActionStatus; contactMethod: ContactMethod; notes: string }>
  >({});
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});

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
      const data = (await response.json()) as { inviteUrl?: string; error?: string };
      if (!response.ok || !data.inviteUrl) {
        throw new Error(data.error || "Unable to generate invite.");
      }

      setInviteLinks((current) => ({ ...current, [row.userId]: data.inviteUrl || "" }));
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
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
              const inviteAllowed = canSendInvite(row);

              return (
                <tr key={row.userId} className="border-b align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground">{row.phone || "-"}</p>
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
                        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                          <input
                            className="min-w-[320px] flex-1 bg-transparent text-xs outline-none"
                            readOnly
                            value={inviteUrl}
                          />
                          <Button size="sm" variant="outline" onClick={() => void handleCopyInvite(row.userId)}>
                            Copy
                          </Button>
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
    </section>
  );
}
