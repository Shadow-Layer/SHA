import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "application_accepted",
        "application_rejected",
        "listing_approved",
        "listing_rejected",
        "new_application",
        "invite_sent",
        "account_claimed",
        "listing_completion_needed",
        "listing_ready_for_review",
      ],
      required: true,
    },
    message: { type: String, required: true },
    relatedId: { type: String },
    relatedType: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
