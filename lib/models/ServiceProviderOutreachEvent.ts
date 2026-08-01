import mongoose, { Schema } from "mongoose";

const ServiceProviderOutreachEventSchema = new Schema({
  providerId: {
    type: Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "contacted",
      "interested",
      "call",
      "whatsapp",
      "in_person",
      "invite_sent",
      "invite_resent",
      "declined",
      "unreachable",
      "claimed",
    ],
  },
  notes: { type: String },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: { type: Date, default: Date.now },
});

ServiceProviderOutreachEventSchema.index({ providerId: 1 });

const ServiceProviderOutreachEvent =
  mongoose.models.ServiceProviderOutreachEvent ||
  mongoose.model("ServiceProviderOutreachEvent", ServiceProviderOutreachEventSchema);

export default ServiceProviderOutreachEvent;
