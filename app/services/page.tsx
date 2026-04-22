import { headers } from "next/headers";

import ServiceDirectoryClient from "@/components/service-providers/ServiceDirectoryClient";

type ServiceProvider = {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContact: "whatsapp" | "call" | "email";
  category:
    | "transport"
    | "wifi_internet"
    | "moving"
    | "cleaning"
    | "repairs_handyman"
    | "food_catering"
    | "security"
    | "other";
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

async function getProviders() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") || "http";

  try {
    const response = await fetch(`${proto}://${host}/api/service-providers`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as ServiceProvider[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const providers = await getProviders();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <ServiceDirectoryClient providers={providers} />
    </main>
  );
}
