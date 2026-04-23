import { connectDB } from "@/lib/db";
import ForumPost from "@/lib/models/ForumPost";

export const FORUM_CATEGORIES = [
  "houses",
  "landlords",
  "locations",
  "amenities",
  "service_providers",
  "services",
  "general",
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export const FORUM_CATEGORY_CONFIG: Record<
  ForumCategory,
  { label: string; description: string }
> = {
  houses: {
    label: "Houses",
    description: "Discuss rentals, rooms, pricing, and house conditions.",
  },
  landlords: {
    label: "Landlords",
    description: "Share experiences and questions about landlords.",
  },
  locations: {
    label: "Locations",
    description: "Compare neighbourhoods, commute times, and safety.",
  },
  amenities: {
    label: "Amenities",
    description: "Talk about WiFi, water, power, furniture, and other extras.",
  },
  service_providers: {
    label: "Service Providers",
    description: "Discuss listed providers and service experiences.",
  },
  services: {
    label: "Service Requests",
    description: "Post requests for transport, WiFi, moving, cleaning, and other services.",
  },
  general: {
    label: "General",
    description: "Anything else related to student housing in Mutare.",
  },
};

export type ForumPostSummary = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  upvoteCount: number;
};

export async function getListingForumPosts(listingId: string): Promise<ForumPostSummary[]> {
  await connectDB();

  const docs = await ForumPost.find({
    status: "active",
    "entityRef.type": "listing",
    "entityRef.id": listingId,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .exec();

  return docs.map((doc) => ({
    id: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "Untitled discussion",
    body: typeof doc.body === "string" ? doc.body : "",
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    upvoteCount: Array.isArray(doc.upvotes) ? doc.upvotes.length : 0,
  }));
}
