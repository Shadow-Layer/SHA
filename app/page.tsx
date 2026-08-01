"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  const [expanded, setExpanded] = useState(false);

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
            Every semester, students lose money to fake listings and dishonest agents.
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="ml-2 inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  expanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </p>
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden pb-1">
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Finding accommodation shouldn&apos;t be risky, stressful, or expensive. Student
                Housing Archive (SHA) exists to change that.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                We&apos;re building a community-powered platform where students share real housing
                information, verify listings, and protect each other from scams. Instead of
                relying on guesswork or word-of-mouth, we create a trusted space built on
                transparency and shared experience.
              </p>
              <p className="mt-4 text-sm font-semibold">
                Your contribution matters. By submitting a housing lead, you help:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Expose fake or suspicious listings</li>
                <li>Highlight genuine, safe accommodation</li>
                <li>Save fellow students from losing money</li>
              </ul>
              <Link
                href="/submit-lead"
                className="mt-4 block text-sm text-muted-foreground underline underline-offset-4"
              >
                👉 Know a place? Share it below and be part of the solution.
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/listings">Find Housing</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/register?role=landlord">List Your Property</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/submit-lead">Share a Lead →</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
            asChild
          >
            <Link href="/providers/join">Earn with SHA</Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Offer your services to students and landlords in Mutare.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 rounded-xl border bg-card p-5 text-sm font-medium sm:grid-cols-2 lg:grid-cols-5">
        <p>No Agent Fees</p>
        <p>Verified Listings</p>
        <p>Real Reviews</p>
        <p>Inbox Messaging</p>
        <p>Service Providers</p>
      </section>
    </main>
  );
}
