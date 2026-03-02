import { notFound } from "next/navigation";

import ApplyPanel from "@/components/listings/ApplyPanel";
import ListingTabs from "@/components/listings/ListingTabs";
import VerifyPanel from "@/components/listings/VerifyPanel";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getListingForumPosts } from "@/lib/forum";
import type { ListingRegulations } from "@/lib/listings";
import { getListingById } from "@/lib/listings";
import Application from "@/lib/models/Application";
import VerificationEvent from "@/lib/models/VerificationEvent";

const OCCUPANCY_LABELS: Record<string, string> = {
  per_head_double: "Per head (double)",
  per_head_triple_plus: "Per head (triple+)",
  per_room: "Per room",
  full_house: "Full house",
  custom: "Custom",
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  borehole: "Borehole",
  prepaid_zesa: "Prepaid ZESA",
  backup_power: "Backup Power",
  kitchen: "Kitchen",
  laundry: "Laundry",
  ensuite: "Ensuite",
  burglar_bars: "Burglar Bars",
  parking: "Parking",
};

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return "Contact for pricing";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildRegulationTags(regulations: ListingRegulations) {
  const tags: string[] = [];

  if (regulations.curfew) {
    if (regulations.curfewTime) {
      tags.push(`Curfew at ${regulations.curfewTime}`);
    } else {
      tags.push("Curfew enforced");
    }
  }
  if (typeof regulations.visitorsAllowed === "boolean") {
    tags.push(regulations.visitorsAllowed ? "Visitors allowed" : "No visitors");
  }
  if (regulations.noSmoking) {
    tags.push("No smoking");
  }
  if (regulations.noParties) {
    tags.push("No parties");
  }
  if (regulations.quietHours) {
    tags.push("Quiet hours");
  }
  if (regulations.separateLease) {
    tags.push("Separate leases");
  }
  if (regulations.noPets) {
    tags.push("No pets");
  }
  if (regulations.tenantsCleaning) {
    tags.push("Tenants handle cleaning");
  }
  if (regulations.otherRegulations) {
    tags.push(regulations.otherRegulations);
  }

  return tags;
}

type ListingDetailPageProps = {
  params: { id: string };
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const session = await getAuthSession();
  const isAdmin = session?.user?.role === "admin";
  const listing = await getListingById(params.id, { includeUnpublished: isAdmin });

  if (!listing) {
    notFound();
  }

  const isAuthenticated = Boolean(session?.user);
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  let applicationStatus: "pending" | "accepted" | "rejected" | "withdrawn" | null = null;
  let applicationId: string | undefined;
  let verificationType: "stayed" | "seen" | "suspicious" | null = null;

  if (userId && userRole === "student") {
    await connectDB();
    const [application, verification] = await Promise.all([
      Application.findOne({ listingId: listing.id, studentId: userId }).lean().exec(),
      VerificationEvent.findOne({ listingId: listing.id, studentId: userId }).lean().exec(),
    ]);

    if (application) {
      if (application.status) {
        applicationStatus = application.status;
      }
      applicationId = String(application._id);
    }
    if (verification?.type) {
      verificationType = verification.type;
    }
  }

  const discussions = await getListingForumPosts(listing.id);
  await connectDB();
  const verificationReviews = await VerificationEvent.find({
    listingId: listing.id,
    type: { $in: ["stayed", "seen"] },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select({ _id: 1, type: 1, note: 1, createdAt: 1 })
    .lean()
    .exec();

  const reviews: Array<{ id: string; rating: number; text: string; stayPeriod?: string }> =
    verificationReviews.map((verification) => {
      const rating = verification.type === "stayed" ? 5 : 3;
      const fallbackText =
        verification.type === "stayed"
          ? "Verified stay by a student."
          : "Student has seen this listing in person.";
      const text =
        typeof verification.note === "string" && verification.note.trim().length > 0
          ? verification.note.trim()
          : fallbackText;
      const stayPeriod =
        verification.createdAt instanceof Date
          ? `Verified ${formatDate(verification.createdAt.toISOString())}`
          : undefined;

      return {
        id: String(verification._id),
        rating,
        text,
        stayPeriod,
      };
    });

  const verificationBadge =
    listing.status === "warning"
      ? { label: "Under Review", className: "bg-amber-100 text-amber-900" }
      : listing.verificationLevel === "student_verified"
        ? { label: "Student Verified", className: "bg-emerald-100 text-emerald-900" }
        : { label: "Landlord Confirmed", className: "bg-blue-100 text-blue-900" };

  const regulationTags = buildRegulationTags(listing.regulations);
  const loginHref = `/auth/login?callbackUrl=/listings/${listing.id}`;
  const discussionLink = `/forum?entityType=listing&entityId=${listing.id}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${verificationBadge.className}`}>
            {verificationBadge.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Last updated {formatDate(listing.updatedAt)}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
        <p className="text-sm text-muted-foreground">
          {listing.area}
          {listing.landmark ? ` · Near ${listing.landmark}` : ""}
        </p>
      </header>

      <section className="mt-6 space-y-4">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {listing.photos.length > 0 ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-4">
              {listing.photos.map((photo, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${listing.id}-photo-${index}`}
                  src={photo}
                  alt={`${listing.title} photo ${index + 1}`}
                  className="h-56 w-full flex-shrink-0 snap-center rounded-lg object-cover sm:h-72 sm:w-96"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No photos available
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Rent options</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Occupancy type</th>
                    <th className="px-4 py-2 text-left font-medium">Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.occupancyOptions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-sm text-muted-foreground" colSpan={2}>
                        Rent information available on request.
                      </td>
                    </tr>
                  ) : (
                    listing.occupancyOptions.map((option, index) => (
                      <tr key={`${listing.id}-rent-${index}`} className="border-t border-border">
                        <td className="px-4 py-3">
                          {OCCUPANCY_LABELS[option.type] ?? "Custom"}
                          {option.description ? (
                            <span className="block text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(option.rentAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Amenities</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No amenities listed.</p>
              ) : (
                listing.amenities.map((amenity) => (
                  <span
                    key={`${listing.id}-amenity-${amenity}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {AMENITY_LABELS[amenity] ?? amenity}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">House rules & regulations</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {regulationTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No regulations listed.</p>
              ) : (
                regulationTags.map((tag) => (
                  <span
                    key={`${listing.id}-rule-${tag}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Tenant preferences</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.tenantPreferences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No preferences listed.</p>
              ) : (
                listing.tenantPreferences.map((preference) => (
                  <span
                    key={`${listing.id}-preference-${preference}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {preference}
                  </span>
                ))
              )}
            </div>
          </section>

          <ListingTabs
            reviews={reviews}
            discussions={discussions}
            discussionLink={discussionLink}
          />
        </div>

        <div className="space-y-6">
            <ApplyPanel
            listingId={listing.id}
            isAuthenticated={isAuthenticated}
            loginHref={loginHref}
            occupancyOptions={listing.occupancyOptions}
            applicationStatus={applicationStatus}
            applicationId={applicationId}
          />
          <p className="text-sm text-muted-foreground">
            {listing.confirmationCount} student{listing.confirmationCount !== 1 ? 's' : ''} confirmed · {listing.suspiciousCount} flagged
          </p>
          <VerifyPanel
            listingId={listing.id}
            isAuthenticated={isAuthenticated}
            loginHref={loginHref}
            existingVerification={verificationType}
          />
        </div>
      </section>
    </main>
  );
}
