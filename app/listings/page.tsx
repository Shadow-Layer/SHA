import BrowseListingsClient from "@/components/listings/BrowseListingsClient";
import { getPublishedListings, parseListingsSearchParams } from "@/lib/listings";

type ListingsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const { filters, options } = parseListingsSearchParams(searchParams);
  const result = await getPublishedListings(filters, options);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Browse Listings</h1>
        <p className="mt-2 text-muted-foreground">
          Explore published student housing listings with transparent pricing.
        </p>
      </header>
      <BrowseListingsClient
        listings={result.listings}
        pagination={result.pagination}
        searchParams={searchParams}
        filters={filters}
      />
    </main>
  );
}
