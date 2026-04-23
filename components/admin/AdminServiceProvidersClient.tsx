"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ServiceCategory =
  | "transport"
  | "wifi_internet"
  | "moving"
  | "cleaning"
  | "repairs_handyman"
  | "food_catering"
  | "security"
  | "other";
type ProviderStatus = "pending_review" | "published" | "removed" | "unclaimed";
type ContactStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "declined"
  | "unreachable"
  | "invited"
  | "claimed";
type OutreachEvent = {
  id: string;
  type: string;
  transition: string;
  notes: string;
  createdAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
};

type ServiceProviderRow = {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContact: "whatsapp" | "call" | "email";
  category: ServiceCategory;
  description: string;
  areasServed: string;
  availability: "always" | "weekdays" | "weekends" | "on_request";
  priceRange: string;
  pricingNotes: string;
  targetCustomers: "students" | "landlords" | "both";
  photos: string[];
  status: ProviderStatus;
  contactStatus: ContactStatus;
  contactedAt: string | null;
  lastContactMethod: "call" | "whatsapp" | "in_person" | null;
  lastContactNotes: string;
  consentGiven: boolean;
  source: "self_signup" | "admin_created";
  createdAt: string | null;
  updatedAt: string | null;
};

const FILTER_TABS: Array<{ label: string; value: "all" | ProviderStatus }> = [
  { label: "Unclaimed", value: "unclaimed" },
  { label: "Pending", value: "pending_review" },
  { label: "Published", value: "published" },
  { label: "Removed", value: "removed" },
  { label: "All", value: "all" },
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

function formatDateTime(value: string | null) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getStatusBadgeClass(value: ProviderStatus) {
  switch (value) {
    case "pending_review":
      return "bg-amber-100 text-amber-700";
    case "published":
      return "bg-emerald-100 text-emerald-700";
    case "removed":
      return "bg-rose-100 text-rose-700";
    case "unclaimed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getContactBadgeClass(value: ContactStatus) {
  switch (value) {
    case "contacted":
      return "bg-amber-100 text-amber-700";
    case "interested":
      return "bg-blue-100 text-blue-700";
    case "invited":
    case "claimed":
      return "bg-emerald-100 text-emerald-700";
    case "declined":
    case "unreachable":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getCategoryBadgeClass(category: ServiceCategory) {
  switch (category) {
    case "transport":
      return "bg-blue-100 text-blue-700";
    case "wifi_internet":
      return "bg-yellow-100 text-yellow-800";
    case "moving":
      return "bg-indigo-100 text-indigo-700";
    case "cleaning":
      return "bg-emerald-100 text-emerald-700";
    case "repairs_handyman":
      return "bg-orange-100 text-orange-700";
    case "food_catering":
      return "bg-pink-100 text-pink-700";
    case "security":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminServiceProvidersClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | ProviderStatus>("all");
  const [rows, setRows] = useState<ServiceProviderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderRow | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const isUnclaimedTab = activeTab === "unclaimed";

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = activeTab === "all" ? "" : `?status=${activeTab}`;

    try {
      const response = await fetch(`/api/admin/service-providers${query}`, { cache: "no-store" });
      const data = (await response.json()) as { providers?: ServiceProviderRow[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load service providers.");
      }

      const nextRows = Array.isArray(data.providers) ? data.providers : [];
      setRows(nextRows);
      setSelectedProvider((current) =>
        current ? nextRows.find((row) => row.id === current.id) ?? current : null,
      );
    } catch (loadFailure) {
      setError(
        loadFailure instanceof Error ? loadFailure.message : "Unable to load service providers.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadEvents = useCallback(async (providerId: string) => {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const response = await fetch(`/api/admin/service-providers/${providerId}/events`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { events?: OutreachEvent[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load outreach history.");
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (loadFailure) {
      setEventsError(
        loadFailure instanceof Error ? loadFailure.message : "Unable to load outreach history.",
      );
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!selectedProvider) {
      setEvents([]);
      setEventsError(null);
      setEventsLoading(false);
      return;
    }

    void loadEvents(selectedProvider.id);
  }, [loadEvents, selectedProvider]);

  async function updateStatus(providerId: string, status: "published" | "removed") {
    setWorkingId(providerId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as {
        provider?: ServiceProviderRow;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update service provider.");
      }

      await loadRows();
      router.refresh();
    } catch (updateFailure) {
      setError(
        updateFailure instanceof Error
          ? updateFailure.message
          : "Unable to update service provider.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function updateContactStatus(providerId: string, contactStatus: "contacted" | "interested" | "declined") {
    setWorkingId(providerId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-providers/${providerId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactStatus }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to update contact status.");
      }

      await loadRows();
      if (selectedProvider?.id === providerId) {
        await loadEvents(providerId);
      }
    } catch (updateFailure) {
      setError(
        updateFailure instanceof Error ? updateFailure.message : "Unable to update contact status.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function generateInvite(providerId: string) {
    setWorkingId(providerId);
    setError(null);
    setCopiedInviteId(null);

    try {
      const response = await fetch(`/api/admin/service-providers/${providerId}/invite`, {
        method: "POST",
      });
      const data = (await response.json()) as { claimUrl?: string; error?: string };
      if (!response.ok || !data.claimUrl) {
        throw new Error(data.error || "Unable to generate invite link.");
      }

      const claimUrl = new URL(data.claimUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(claimUrl);
      setCopiedInviteId(providerId);
      window.setTimeout(() => {
        setCopiedInviteId((current) => (current === providerId ? null : current));
      }, 2000);

      await loadRows();
      if (selectedProvider?.id === providerId) {
        await loadEvents(providerId);
      }
    } catch (inviteFailure) {
      setError(
        inviteFailure instanceof Error ? inviteFailure.message : "Unable to generate invite link.",
      );
    } finally {
      setWorkingId(null);
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
        <table className={`w-full text-sm ${isUnclaimedTab ? "min-w-[1120px]" : "min-w-[1080px]"}`}>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Business Name</th>
              {isUnclaimedTab ? <th className="py-2 pr-4">Phone</th> : null}
              <th className="py-2 pr-4">Category</th>
              {isUnclaimedTab ? <th className="py-2 pr-4">Contact Status</th> : null}
              {isUnclaimedTab ? <th className="py-2 pr-4">Last Contact</th> : null}
              {!isUnclaimedTab ? <th className="py-2 pr-4">Phone</th> : null}
              {!isUnclaimedTab ? <th className="py-2 pr-4">Areas</th> : null}
              {!isUnclaimedTab ? <th className="py-2 pr-4">Status</th> : null}
              {!isUnclaimedTab ? <th className="py-2 pr-4">Submitted</th> : null}
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b align-top">
                <td className="py-3 pr-4">
                  <p className="font-medium">{row.businessName}</p>
                  <p className="text-muted-foreground">{row.contactName || "No contact name"}</p>
                </td>

                {isUnclaimedTab ? <td className="py-3 pr-4">{row.phone || "-"}</td> : null}

                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getCategoryBadgeClass(row.category)}`}
                  >
                    {formatLabel(row.category)}
                  </span>
                </td>

                {isUnclaimedTab ? (
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getContactBadgeClass(row.contactStatus)}`}
                    >
                      {formatLabel(row.contactStatus)}
                    </span>
                  </td>
                ) : null}

                {isUnclaimedTab ? (
                  <td className="py-3 pr-4">
                    <p>{formatDate(row.contactedAt)}</p>
                    {row.lastContactMethod ? (
                      <p className="text-xs text-muted-foreground capitalize">
                        {formatLabel(row.lastContactMethod)}
                      </p>
                    ) : null}
                  </td>
                ) : null}

                {!isUnclaimedTab ? <td className="py-3 pr-4">{row.phone}</td> : null}
                {!isUnclaimedTab ? <td className="py-3 pr-4">{row.areasServed || "-"}</td> : null}

                {!isUnclaimedTab ? (
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(row.status)}`}
                    >
                      {formatLabel(row.status)}
                    </span>
                  </td>
                ) : null}

                {!isUnclaimedTab ? <td className="py-3 pr-4">{formatDate(row.createdAt)}</td> : null}

                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-2">
                    {isUnclaimedTab ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void generateInvite(row.id)}
                        >
                          {copiedInviteId === row.id ? "Copied!" : "Generate Invite Link"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void updateContactStatus(row.id, "contacted")}
                        >
                          Mark Contacted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void updateContactStatus(row.id, "interested")}
                        >
                          Mark Interested
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void updateContactStatus(row.id, "declined")}
                        >
                          Mark Declined
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedProvider(row)}>
                          View
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setSelectedProvider(row)}>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id || row.status === "published"}
                          onClick={() => void updateStatus(row.id, "published")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id || row.status === "removed"}
                          onClick={() => void updateStatus(row.id, "removed")}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No service providers in this view.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading...</p> : null}

      <Sheet
        open={Boolean(selectedProvider)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProvider(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedProvider ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedProvider.businessName}</SheetTitle>
                <SheetDescription>
                  {selectedProvider.phone} · {formatLabel(selectedProvider.category)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="rounded-lg border p-4">
                  <h2 className="text-sm font-semibold">Provider Details</h2>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Business Name</dt>
                      <dd className="text-right font-medium">{selectedProvider.businessName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Contact Name</dt>
                      <dd className="text-right">{selectedProvider.contactName || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="text-right">{selectedProvider.phone}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="text-right">{selectedProvider.email || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Preferred Contact</dt>
                      <dd className="text-right capitalize">
                        {formatLabel(selectedProvider.preferredContact)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Contact Status</dt>
                      <dd className="text-right capitalize">
                        {formatLabel(selectedProvider.contactStatus)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Last Contact</dt>
                      <dd className="text-right">{formatDateTime(selectedProvider.contactedAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Last Contact Method</dt>
                      <dd className="text-right capitalize">
                        {selectedProvider.lastContactMethod
                          ? formatLabel(selectedProvider.lastContactMethod)
                          : "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Last Contact Notes</dt>
                      <dd className="max-w-sm text-right">
                        {selectedProvider.lastContactNotes || "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Availability</dt>
                      <dd className="text-right capitalize">
                        {formatLabel(selectedProvider.availability)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Areas Served</dt>
                      <dd className="text-right">{selectedProvider.areasServed || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Target Customers</dt>
                      <dd className="text-right capitalize">
                        {formatLabel(selectedProvider.targetCustomers)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="text-right capitalize">{formatLabel(selectedProvider.status)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Submitted</dt>
                      <dd className="text-right">{formatDate(selectedProvider.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-lg border p-4">
                  <h2 className="text-sm font-semibold">Service Details</h2>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="max-w-sm text-right">
                        {selectedProvider.description || "No description provided."}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Pricing</dt>
                      <dd className="text-right">{selectedProvider.priceRange || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Pricing Notes</dt>
                      <dd className="max-w-sm text-right">{selectedProvider.pricingNotes || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Photos</dt>
                      <dd className="text-right">{selectedProvider.photos.length} uploaded</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Consent</dt>
                      <dd className="text-right">
                        {selectedProvider.consentGiven ? "Confirmed" : "Missing"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="text-right capitalize">{formatLabel(selectedProvider.source)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-semibold">Outreach History</h2>
                    {selectedProvider ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={eventsLoading}
                        onClick={() => void loadEvents(selectedProvider.id)}
                      >
                        Refresh
                      </Button>
                    ) : null}
                  </div>

                  {eventsError ? <p className="mt-3 text-sm text-red-600">{eventsError}</p> : null}
                  {eventsLoading ? (
                    <p className="mt-3 text-sm text-muted-foreground">Loading outreach history...</p>
                  ) : null}
                  {!eventsLoading && !eventsError && events.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No outreach events yet.</p>
                  ) : null}

                  {!eventsLoading && events.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium capitalize">
                                {formatLabel(event.transition || event.type)}
                              </p>
                              {event.transition ? (
                                <p className="text-xs text-muted-foreground">
                                  Status change recorded
                                </p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                {event.createdByName || "System"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(event.createdAt)}
                            </p>
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            {event.notes || "No notes recorded."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
