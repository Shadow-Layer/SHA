import mongoose, { Schema } from "mongoose";

const SERVICE_PROVIDER_CATEGORIES = [
  "transport",
  "wifi_internet",
  "moving",
  "cleaning",
  "repairs_handyman",
  "food_catering",
  "security",
  "other",
] as const;

const SERVICE_PROVIDER_CONTACT_METHODS = ["whatsapp", "call", "email"] as const;
const SERVICE_PROVIDER_AVAILABILITY = ["always", "weekdays", "weekends", "on_request"] as const;
const SERVICE_PROVIDER_TARGET_CUSTOMERS = ["students", "landlords", "both"] as const;
const SERVICE_PROVIDER_STATUSES = ["pending_review", "published", "removed"] as const;
const SERVICE_PROVIDER_SOURCES = ["self_signup", "admin_created"] as const;

const ServiceProviderSchema = new Schema(
  {
    businessName: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    preferredContact: {
      type: String,
      enum: SERVICE_PROVIDER_CONTACT_METHODS,
      required: true,
    },
    category: {
      type: String,
      enum: SERVICE_PROVIDER_CATEGORIES,
      required: true,
    },
    description: { type: String, trim: true },
    areasServed: { type: String, trim: true },
    availability: {
      type: String,
      enum: SERVICE_PROVIDER_AVAILABILITY,
      required: true,
    },
    priceRange: { type: String, trim: true },
    pricingNotes: { type: String, trim: true },
    targetCustomers: {
      type: String,
      enum: SERVICE_PROVIDER_TARGET_CUSTOMERS,
      required: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: SERVICE_PROVIDER_STATUSES,
      default: "pending_review",
    },
    consentGiven: { type: Boolean, required: true },
    source: {
      type: String,
      enum: SERVICE_PROVIDER_SOURCES,
      default: "self_signup",
    },
  },
  { timestamps: true },
);

const ServiceProvider =
  mongoose.models.ServiceProvider || mongoose.model("ServiceProvider", ServiceProviderSchema);

export default ServiceProvider;
