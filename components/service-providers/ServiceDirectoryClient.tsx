"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ServiceCategory =
  | "transport"
  | "wifi_internet"
  | "moving"
  | "cleaning"
  | "repairs_handyman"
  | "food_catering"
  | "security"
  | "other";

type ServiceProvider = {
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
  status: "published";
  rating: number;
  feedbackCount: number;
  upvoteCount: number;
  viewerHasUpvoted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type FeedbackItem = {
  id?: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  authorName?: string;
  createdAt: string | null;
};

type ProviderFeedbackState = {
  feedback: FeedbackItem[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

const CATEGORY_TABS: Array<{ label: string; value: "all" | ServiceCategory }> = [
  { label: "All", value: "all" },
  { label: "Transport", value: "transport" },
  { label: "WiFi", value: "wifi_internet" },
  { label: "Moving", value: "moving" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Repairs", value: "repairs_handyman" },
  { label: "Food", value: "food_catering" },
  { label: "Security", value: "security" },
  { label: "Other", value: "other" },
];

function getCategoryLabel(category: ServiceCategory) {
  switch (category) {
    case "transport":
      return "Transport";
    case "wifi_internet":
      return "WiFi / Internet";
    case "moving":
      return "Moving";
    case "cleaning":
      return "Cleaning";
    case "repairs_handyman":
      return "Repairs / Handyman";
    case "food_catering":
      return "Food / Catering";
    case "security":
      return "Security";
    default:
      return "Other";
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

function formatAvailability(value: ServiceProvider["availability"]) {
  switch (value) {
    case "always":
      return "Always available";
    case "weekdays":
      return "Weekdays";
    case "weekends":
      return "Weekends";
    default:
      return "On request";
  }
}

function formatTargetCustomers(value: ServiceProvider["targetCustomers"]) {
  switch (value) {
    case "students":
      return "Students";
    case "landlords":
      return "Landlords";
    default:
      return "Students & landlords";
  }
}

function formatPreferredContact(value: ServiceProvider["preferredContact"]) {
  switch (value) {
    case "whatsapp":
      return "WhatsApp";
    case "call":
      return "Phone call";
    default:
      return "Email";
  }
}

function renderStars(rating: number) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function formatFeedbackDate(value: string | null) {
  if (!value) {
    return "Recently";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ServiceDirectoryClient({
  providers,
  isAuthenticated,
}: {
  providers: ServiceProvider[];
  isAuthenticated: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<"all" | ServiceCategory>("all");
  const [revealedContactId, setRevealedContactId] = useState<string | null>(null);
  const [providerState, setProviderState] = useState(providers);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const [submittingUpvoteId, setSubmittingUpvoteId] = useState<string | null>(null);
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [reviewErrorByProvider, setReviewErrorByProvider] = useState<Record<string, string | null>>({});
  const [upvoteErrorByProvider, setUpvoteErrorByProvider] = useState<Record<string, string | null>>({});
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<
      string,
      {
        rating: number;
        comment: string;
        isAnonymous: boolean;
        consentToReveal: boolean;
      }
    >
  >({});
  const [feedbackByProvider, setFeedbackByProvider] = useState<Record<string, ProviderFeedbackState>>(
    {},
  );

  const filteredProviders =
    activeCategory === "all"
      ? providerState
      : providerState.filter((provider) => provider.category === activeCategory);

  function getDraft(providerId: string) {
    return (
      reviewDrafts[providerId] || {
        rating: 5,
        comment: "",
        isAnonymous: true,
        consentToReveal: false,
      }
    );
  }

  function updateProvider(
    providerId: string,
    updater: (provider: ServiceProvider) => ServiceProvider,
  ) {
    setProviderState((current) =>
      current.map((provider) => (provider.id === providerId ? updater(provider) : provider)),
    );
  }

  async function loadFeedback(providerId: string) {
    const current = feedbackByProvider[providerId];
    if (current?.loaded || current?.loading) {
      return;
    }

    setFeedbackByProvider((prev) => ({
      ...prev,
      [providerId]: {
        feedback: prev[providerId]?.feedback || [],
        loaded: false,
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/service-providers/${providerId}/feedback`);
      const data = (await response.json()) as {
        error?: string;
        feedback?: FeedbackItem[];
        averageRating?: number;
        totalCount?: number;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load reviews");
      }

      setFeedbackByProvider((prev) => ({
        ...prev,
        [providerId]: {
          feedback: Array.isArray(data.feedback) ? data.feedback : [],
          loaded: true,
          loading: false,
          error: null,
        },
      }));

      updateProvider(providerId, (provider) => ({
        ...provider,
        rating: typeof data.averageRating === "number" ? data.averageRating : provider.rating,
        feedbackCount: typeof data.totalCount === "number" ? data.totalCount : provider.feedbackCount,
      }));
    } catch (error) {
      setFeedbackByProvider((prev) => ({
        ...prev,
        [providerId]: {
          feedback: prev[providerId]?.feedback || [],
          loaded: false,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load reviews.",
        },
      }));
    }
  }

  async function handleUpvote(providerId: string) {
    if (!isAuthenticated) {
      return;
    }

    setSubmittingUpvoteId(providerId);
    setUpvoteErrorByProvider((prev) => ({ ...prev, [providerId]: null }));

    try {
      const response = await fetch(`/api/service-providers/${providerId}/upvote`, { method: "POST" });
      const data = (await response.json()) as { error?: string; upvoted?: boolean; count?: number };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update upvote");
      }

      updateProvider(providerId, (provider) => ({
        ...provider,
        viewerHasUpvoted: data.upvoted === true,
        upvoteCount: typeof data.count === "number" ? data.count : provider.upvoteCount,
      }));
    } catch (error) {
      setUpvoteErrorByProvider((prev) => ({
        ...prev,
        [providerId]: error instanceof Error ? error.message : "Unable to update upvote.",
      }));
    } finally {
      setSubmittingUpvoteId(null);
    }
  }

  async function handleReviewSubmit(providerId: string) {
    if (!isAuthenticated) {
      return;
    }

    const draft = getDraft(providerId);
    setSubmittingReviewId(providerId);
    setReviewErrorByProvider((prev) => ({ ...prev, [providerId]: null }));

    try {
      const response = await fetch(`/api/service-providers/${providerId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as {
        error?: string;
        feedback?: FeedbackItem;
        averageRating?: number;
        totalCount?: number;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to save review");
      }

      updateProvider(providerId, (provider) => ({
        ...provider,
        rating: typeof data.averageRating === "number" ? data.averageRating : provider.rating,
        feedbackCount: typeof data.totalCount === "number" ? data.totalCount : provider.feedbackCount,
      }));

      if (data.feedback) {
        const nextFeedback = data.feedback;
        setFeedbackByProvider((prev) => {
          const existingItems = prev[providerId]?.feedback || [];
          const withoutCurrent = nextFeedback.id
            ? existingItems.filter((item) => item.id !== nextFeedback.id)
            : existingItems;

          return {
            ...prev,
            [providerId]: {
              feedback: [nextFeedback, ...withoutCurrent].sort((a, b) =>
                (b.createdAt || "").localeCompare(a.createdAt || ""),
              ),
              loaded: true,
              loading: false,
              error: null,
            },
          };
        });
      }

      setReviewDrafts((prev) => ({
        ...prev,
        [providerId]: {
          rating: draft.rating,
          comment: "",
          isAnonymous: true,
          consentToReveal: false,
        },
      }));
    } catch (error) {
      setReviewErrorByProvider((prev) => ({
        ...prev,
        [providerId]: error instanceof Error ? error.message : "Unable to save review.",
      }));
    } finally {
      setSubmittingReviewId(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Providers</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Trusted services for students and landlords in Mutare.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/services/register">List Your Service</Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={activeCategory === tab.value ? "default" : "outline"}
            onClick={() => setActiveCategory(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {filteredProviders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">No services listed yet.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Be the first to add yours.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => {
            const isRevealed = revealedContactId === provider.id;

            return (
              <article key={provider.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeClass(provider.category)}`}
                >
                  {getCategoryLabel(provider.category)}
                </span>

                <h2 className="mt-4 text-lg font-semibold">{provider.businessName}</h2>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {provider.feedbackCount > 0
                    ? `${renderStars(provider.rating)} ${provider.rating.toFixed(1)} · ${provider.feedbackCount} ${
                        provider.feedbackCount === 1 ? "review" : "reviews"
                      }`
                    : "No reviews yet"}
                </p>
                {provider.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{provider.description}</p>
                ) : null}

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>Areas: {provider.areasServed || "Available on request"}</p>
                  <p>Availability: {formatAvailability(provider.availability)}</p>
                  <p>For: {formatTargetCustomers(provider.targetCustomers)}</p>
                  <p>Price: {provider.priceRange || "Contact for pricing"}</p>
                </div>

                {isRevealed ? (
                  <div className="mt-4 rounded-lg border bg-muted/40 px-3 py-3 text-sm">
                    <p className="font-medium text-foreground">{provider.phone}</p>
                    <p className="mt-1 text-muted-foreground">
                      Preferred contact: {formatPreferredContact(provider.preferredContact)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    variant={provider.viewerHasUpvoted ? "default" : "outline"}
                    title={isAuthenticated ? undefined : "Sign in to upvote"}
                    disabled={submittingUpvoteId === provider.id}
                    onClick={() => void handleUpvote(provider.id)}
                  >
                    ▲ {provider.upvoteCount}
                  </Button>
                  <Button
                    className="flex-1"
                    variant={openReviewId === provider.id ? "default" : "outline"}
                    onClick={() => {
                      const nextOpenId = openReviewId === provider.id ? null : provider.id;
                      setOpenReviewId(nextOpenId);
                      if (nextOpenId) {
                        void loadFeedback(provider.id);
                      }
                    }}
                  >
                    Leave a review
                  </Button>
                </div>

                {upvoteErrorByProvider[provider.id] ? (
                  <p className="mt-2 text-sm text-red-600">{upvoteErrorByProvider[provider.id]}</p>
                ) : null}

                {openReviewId === provider.id ? (
                  <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                    {isAuthenticated ? (
                      <>
                        <div>
                          <p className="text-sm font-medium">Your rating</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={cn(
                                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                                  getDraft(provider.id).rating === value
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                                )}
                                onClick={() =>
                                  setReviewDrafts((prev) => ({
                                    ...prev,
                                    [provider.id]: {
                                      ...getDraft(provider.id),
                                      rating: value,
                                    },
                                  }))
                                }
                              >
                                {"★".repeat(value)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="mt-4 block text-sm font-medium">
                          Comment
                          <textarea
                            rows={4}
                            className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
                            placeholder="Share what stood out about this provider."
                            value={getDraft(provider.id).comment}
                            onChange={(event) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [provider.id]: {
                                  ...getDraft(provider.id),
                                  comment: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>

                        <label className="mt-4 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={getDraft(provider.id).isAnonymous}
                            onChange={(event) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [provider.id]: {
                                  ...getDraft(provider.id),
                                  isAnonymous: event.target.checked,
                                },
                              }))
                            }
                          />
                          Post anonymously
                        </label>

                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={getDraft(provider.id).consentToReveal}
                            onChange={(event) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [provider.id]: {
                                  ...getDraft(provider.id),
                                  consentToReveal: event.target.checked,
                                },
                              }))
                            }
                          />
                          Allow SHA to show my name
                        </label>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            disabled={submittingReviewId === provider.id}
                            onClick={() => void handleReviewSubmit(provider.id)}
                          >
                            {submittingReviewId === provider.id ? "Saving..." : "Submit review"}
                          </Button>
                          <Button variant="outline" onClick={() => setOpenReviewId(null)}>
                            Close
                          </Button>
                        </div>
                        {reviewErrorByProvider[provider.id] ? (
                          <p className="mt-3 text-sm text-red-600">
                            {reviewErrorByProvider[provider.id]}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Sign in to leave a review for this provider.
                        </p>
                        <Button asChild variant="outline">
                          <Link href={`/auth/login?callbackUrl=/services`}>Sign in</Link>
                        </Button>
                      </div>
                    )}

                    <div className="mt-5">
                      <h3 className="text-sm font-semibold">Recent reviews</h3>
                      {feedbackByProvider[provider.id]?.loading ? (
                        <p className="mt-2 text-sm text-muted-foreground">Loading reviews...</p>
                      ) : feedbackByProvider[provider.id]?.error ? (
                        <p className="mt-2 text-sm text-red-600">
                          {feedbackByProvider[provider.id]?.error}
                        </p>
                      ) : (feedbackByProvider[provider.id]?.feedback || []).length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {(feedbackByProvider[provider.id]?.feedback || []).slice(0, 3).map((item) => (
                            <article key={item.id || `${item.createdAt}-${item.rating}`} className="rounded-lg border bg-white p-3">
                              <p className="text-sm font-medium">
                                {renderStars(item.rating)} {item.rating.toFixed(1)}
                              </p>
                              {item.comment ? (
                                <p className="mt-2 text-sm text-muted-foreground">{item.comment}</p>
                              ) : null}
                              <p className="mt-2 text-xs text-muted-foreground">
                                {item.authorName || "Anonymous"} · {formatFeedbackDate(item.createdAt)}
                              </p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <Button
                  className="mt-4 w-full"
                  variant={isRevealed ? "outline" : "default"}
                  onClick={() => setRevealedContactId(isRevealed ? null : provider.id)}
                >
                  {isRevealed ? "Hide Contact" : "Contact Provider"}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
