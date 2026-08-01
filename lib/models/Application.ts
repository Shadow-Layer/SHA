import mongoose, { Schema } from "mongoose";

const ApplicationSchema = new Schema(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    moveInDate: { type: Date },
    occupancyPreference: { type: String },
    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
  },
  { timestamps: true },
);

ApplicationSchema.index({ listingId: 1, studentId: 1 }, { unique: true });

const Application =
  mongoose.models.Application || mongoose.model("Application", ApplicationSchema);

export default Application;
