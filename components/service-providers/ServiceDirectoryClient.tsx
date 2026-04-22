"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

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
  createdAt: string | null;
  updatedAt: string | null;
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

export default function ServiceDirectoryClient({ providers }: { providers: ServiceProvider[] }) {
  const [activeCategory, setActiveCategory] = useState<"all" | ServiceCategory>("all");
  const [revealedContactId, setRevealedContactId] = useState<string | null>(null);

  const filteredProviders =
    activeCategory === "all"
      ? providers
      : providers.filter((provider) => provider.category === activeCategory);

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
