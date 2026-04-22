"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import FilterBar from "@/components/listings/FilterBar";
import { Button } from "@/components/ui/button";
import type {
  ListingCardData,
  ListingFilters,
  ListingsResult,
} from "@/lib/listings";

const BrowseMap = dynamic(() => import("@/components/listings/BrowseMap"), {
  ssr: false,
});

type BrowseListingsClientProps = {
  listings: ListingCardData[];
  pagination: ListingsResult["pagination"];
  searchParams: Record<string, string | string[] | undefined>;
  filters: ListingFilters;
};

function buildPageHref(
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "page" || typeof value === "undefined") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.append(key, item);
      });
      return;
    }

    params.set(key, value);
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/listings?${query}` : "/listings";
}

export default function BrowseListingsClient({
  listings,
  pagination,
  searchParams,
  filters,
}: BrowseListingsClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const hasListings = listings.length > 0;

  return (
    <>
      <section className="mt-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <FilterBar
              initialArea={filters.area}
              initialMinRent={filters.minRent}
              initialMaxRent={filters.maxRent}
              initialOccupancyType={filters.occupancyType}
              initialAmenity={filters.amenities?.[0]}
            />
          </div>
          <div className="ml-auto flex rounded-lg border bg-card p-1 shadow-sm">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
            <Button
              type="button"
              variant={viewMode === "map" ? "default" : "ghost"}
              onClick={() => setViewMode("map")}
            >
              Map
            </Button>
          </div>
        </div>
      </section>

      {!hasListings ? (
        <section className="mt-8 rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold">No published listings yet</h2>
          <p className="mt-2 text-muted-foreground">
            Help grow SHA by sharing trusted student housing options.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/auth/register?role=student">Know a place? Submit a lead</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register?role=landlord">
                Are you a landlord? List your property
              </Link>
            </Button>
          </div>
        </section>
      ) : viewMode === "map" ? (
        <section className="mt-6">
          <BrowseMap listings={listings} />
        </section>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <Link href={`/listings/${listing.id}`} className="block">
                  <div className="relative h-48 w-full bg-muted">
                    {listing.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photoUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No photo available
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-background px-2 py-1 text-xs font-medium shadow-sm">
                      {listing.verificationLevel === "student_verified"
                        ? "Student Verified"
                        : "Landlord Confirmed"}
                    </span>
                  </div>
                </Link>

                <div className="space-y-2 p-4">
                  <h2 className="text-lg font-semibold">
                    <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">{listing.area}</p>
                  <p className="text-sm">
                    {listing.minRent !== null ? (
                      <>
                        <span className="font-medium">${listing.minRent}</span>/month
                      </>
                    ) : (
                      "Rent available on request"
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ★ {listing.starRating.toFixed(1)} ({listing.reviewCount})
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-8 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} listing
              {pagination.total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              {pagination.page > 1 ? (
                <Button variant="outline" asChild>
                  <Link href={buildPageHref(searchParams, pagination.page - 1)}>Previous</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Previous
                </Button>
              )}
              {pagination.page < pagination.totalPages ? (
                <Button variant="outline" asChild>
                  <Link href={buildPageHref(searchParams, pagination.page + 1)}>Next</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Next
                </Button>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
