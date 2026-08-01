import mongoose, { Schema } from "mongoose";

const ReportSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ["listing", "post", "comment"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ReportSchema.index({ status: 1 });
ReportSchema.index({ targetType: 1 });

const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

export default Report;
