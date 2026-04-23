import ServiceDirectoryClient from "@/components/service-providers/ServiceDirectoryClient";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";

type ServiceProviderDirectoryItem = {
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
  rating: number;
  feedbackCount: number;
  upvoteCount: number;
  viewerHasUpvoted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

async function getProviders(userId?: string): Promise<ServiceProviderDirectoryItem[]> {
  await connectDB();

  try {
    const providers = await ServiceProvider.find({ status: "published" })
      .sort({ businessName: 1 })
      .lean()
      .exec();

    return providers.map((provider) => ({
      id: String(provider._id),
      businessName: typeof provider.businessName === "string" ? provider.businessName : "",
      contactName: typeof provider.contactName === "string" ? provider.contactName : "",
      phone: typeof provider.phone === "string" ? provider.phone : "",
      email: typeof provider.email === "string" ? provider.email : "",
      preferredContact:
        provider.preferredContact === "whatsapp" ||
        provider.preferredContact === "call" ||
        provider.preferredContact === "email"
          ? provider.preferredContact
          : "call",
      category:
        provider.category === "transport" ||
        provider.category === "wifi_internet" ||
        provider.category === "moving" ||
        provider.category === "cleaning" ||
        provider.category === "repairs_handyman" ||
        provider.category === "food_catering" ||
        provider.category === "security" ||
        provider.category === "other"
          ? provider.category
          : "other",
      description: typeof provider.description === "string" ? provider.description : "",
      areasServed: typeof provider.areasServed === "string" ? provider.areasServed : "",
      availability:
        provider.availability === "always" ||
        provider.availability === "weekdays" ||
        provider.availability === "weekends" ||
        provider.availability === "on_request"
          ? provider.availability
          : "on_request",
      priceRange: typeof provider.priceRange === "string" ? provider.priceRange : "",
      pricingNotes: typeof provider.pricingNotes === "string" ? provider.pricingNotes : "",
      targetCustomers:
        provider.targetCustomers === "students" ||
        provider.targetCustomers === "landlords" ||
        provider.targetCustomers === "both"
          ? provider.targetCustomers
          : "both",
      photos: Array.isArray(provider.photos)
        ? provider.photos.filter((photo: unknown): photo is string => typeof photo === "string")
        : [],
      status: "published" as const,
      rating: typeof provider.rating === "number" && Number.isFinite(provider.rating) ? provider.rating : 0,
      feedbackCount: typeof provider.feedbackCount === "number" ? provider.feedbackCount : 0,
      upvoteCount: Array.isArray(provider.upvotes) ? provider.upvotes.length : 0,
      viewerHasUpvoted: Boolean(
        userId &&
          Array.isArray(provider.upvotes) &&
          provider.upvotes.some((upvote: unknown) => String(upvote) === userId),
      ),
      createdAt:
        provider.createdAt instanceof Date
          ? provider.createdAt.toISOString()
          : typeof provider.createdAt === "string"
            ? provider.createdAt
            : null,
      updatedAt:
        provider.updatedAt instanceof Date
          ? provider.updatedAt.toISOString()
          : typeof provider.updatedAt === "string"
            ? provider.updatedAt
            : null,
    }));
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const session = await getAuthSession();
  const providers = await getProviders(session?.user?.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <ServiceDirectoryClient providers={providers} isAuthenticated={Boolean(session?.user?.id)} />
    </main>
  );
}
