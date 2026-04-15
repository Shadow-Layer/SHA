import mongoose, { Schema } from "mongoose";

const LeadSchema = new Schema(
  {
    title: { type: String, required: true },
    area: { type: String, required: true },
    landmark: { type: String },
    contactHint: { type: String },
    notes: { type: String },
    submitterEmail: { type: String },
    status: {
      type: String,
      enum: ["new", "reviewed", "converted"],
      default: "new",
    },
  },
  { timestamps: true },
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

export default Lead;
