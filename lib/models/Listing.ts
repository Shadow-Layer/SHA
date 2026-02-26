import mongoose, { Schema } from "mongoose";

const OccupancyOptionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "per_head_double",
        "per_head_triple_plus",
        "per_room",
        "full_house",
        "custom",
      ],
    },
    rentAmount: { type: Number },
    description: { type: String },
  },
  { _id: false },
);

const RegulationsSchema = new Schema(
  {
    curfew: { type: Boolean },
    visitorsAllowed: { type: Boolean },
    noSmoking: { type: Boolean },
    noParties: { type: Boolean },
    quietHours: { type: Boolean },
    separateLease: { type: Boolean },
    noPets: { type: Boolean },
    tenantsCleaning: { type: Boolean },
    curfewTime: { type: String },
    otherRegulations: { type: String },
  },
  { _id: false },
);

const ListingSchema = new Schema(
  {
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    area: { type: String, required: true },
    landmark: { type: String },
    occupancyOptions: { type: [OccupancyOptionSchema], default: [] },
    amenities: { type: [String], default: [] },
    regulations: { type: RegulationsSchema, default: {} },
    tenantPreferences: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending_review", "published", "warning", "removed"],
      default: "pending_review",
    },
    verificationLevel: {
      type: String,
      enum: ["landlord_confirmed", "student_verified"],
      default: "landlord_confirmed",
    },
    suspiciousCount: { type: Number, default: 0 },
    confirmationCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ListingSchema.index({ status: 1 });
ListingSchema.index({ area: 1 });
ListingSchema.index({ landlordId: 1 });

const Listing = mongoose.models.Listing || mongoose.model("Listing", ListingSchema);

export default Listing;
