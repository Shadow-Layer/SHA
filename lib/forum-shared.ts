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

export const STUDENT_ONLY_FORUM_ACCESS_MESSAGE =
  "The forum is currently available to verified students only. Landlord and admin access is coming in a future update.";

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
