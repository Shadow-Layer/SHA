import mongoose, { Schema } from "mongoose";

const VerificationEventSchema = new Schema(
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
    type: {
      type: String,
      enum: ["stayed", "seen", "suspicious"],
      required: true,
    },
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

VerificationEventSchema.index({ listingId: 1, studentId: 1 }, { unique: true });

const VerificationEvent =
  mongoose.models.VerificationEvent ||
  mongoose.model("VerificationEvent", VerificationEventSchema);

export default VerificationEvent;
