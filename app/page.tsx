import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <section className="rounded-2xl border bg-card px-6 py-14 shadow-sm sm:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Student Housing Archive
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Transparent student housing, backed by real community signals.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          SHA helps students discover safer, verified rentals without relying on hidden fees or
          word-of-mouth guesswork.
        </p>
        <div className="mt-8 border-t pt-8">
          <h2 className="text-xl font-bold">Help Stop Student Housing Scams</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every semester, students lose money to fake listings, dishonest agents, and misleading
            information. Finding accommodation shouldn&apos;t be risky, stressful, or expensive.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Student Housing Archive (SHA) exists to change that.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            We&apos;re building a community-powered platform where students share real housing
            information, verify listings, and protect each other from scams. Instead of relying on
            guesswork or word-of-mouth, we create a trusted space built on transparency and shared
            experience.
          </p>
          <p className="mt-4 text-sm font-semibold">
            Your contribution matters. By submitting a housing lead, you help:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Expose fake or suspicious listings</li>
            <li>Highlight genuine, safe accommodation</li>
            <li>Save fellow students from losing money</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            👉 Know a place? Share it below and be part of the solution.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/listings">Find Housing</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/register?role=landlord">List Your Property</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 rounded-xl border bg-card p-5 text-sm font-medium sm:grid-cols-2 lg:grid-cols-4">
        <p>No Agent Fees</p>
        <p>Verified Listings</p>
        <p>Real Reviews</p>
        <p>Inbox Messaging</p>
      </section>
    </main>
  );
}
