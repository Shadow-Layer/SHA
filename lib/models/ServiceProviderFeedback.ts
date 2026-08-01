import mongoose, { Schema } from "mongoose";

const ServiceProviderFeedbackSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: { type: String },
    isAnonymous: { type: Boolean, default: true },
    consentToReveal: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { timestamps: true },
);

const ServiceProviderFeedback =
  mongoose.models.ServiceProviderFeedback ||
  mongoose.model("ServiceProviderFeedback", ServiceProviderFeedbackSchema);

export default ServiceProviderFeedback;
