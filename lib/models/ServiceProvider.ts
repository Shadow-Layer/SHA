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
const SERVICE_PROVIDER_STATUSES = ["pending_review", "published", "removed", "unclaimed"] as const;
const SERVICE_PROVIDER_SOURCES = ["self_signup", "admin_created", "pdf_import"] as const;
const SERVICE_PROVIDER_CONTACT_STATUSES = [
  "not_contacted",
  "contacted",
  "interested",
  "declined",
  "unreachable",
  "invited",
  "claimed",
] as const;
const SERVICE_PROVIDER_LAST_CONTACT_METHODS = ["call", "whatsapp", "in_person"] as const;
const SERVICE_PROVIDER_PRICING_MODELS = ["fixed", "starting_from", "quote_based"] as const;

const ServiceProviderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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
    inviteTokenHash: { type: String },
    inviteTokenExpiresAt: { type: Date },
    contactStatus: {
      type: String,
      enum: SERVICE_PROVIDER_CONTACT_STATUSES,
      default: "not_contacted",
    },
    contactedAt: { type: Date },
    lastContactMethod: {
      type: String,
      enum: SERVICE_PROVIDER_LAST_CONTACT_METHODS,
    },
    lastContactNotes: { type: String, trim: true },
    pricingModel: {
      type: String,
      enum: SERVICE_PROVIDER_PRICING_MODELS,
    },
    rating: { type: Number, default: 0 },
    upvotes: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    feedbackCount: { type: Number, default: 0 },
    consentGiven: { type: Boolean, required: true },
    source: {
      type: String,
      enum: SERVICE_PROVIDER_SOURCES,
      default: "self_signup",
    },
    importBatchId: { type: String },
  },
  { timestamps: true },
);

const ServiceProvider =
  mongoose.models.ServiceProvider || mongoose.model("ServiceProvider", ServiceProviderSchema);

export default ServiceProvider;
