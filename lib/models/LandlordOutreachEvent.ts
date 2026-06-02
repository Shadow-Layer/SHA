import mongoose, { Schema } from "mongoose";

const LandlordOutreachEventSchema = new Schema({
  landlordId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  listingId: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
  },
  type: {
    type: String,
    enum: [
      "call",
      "whatsapp",
      "in_person",
      "invite_sent",
      "invite_resent",
      "declined",
      "unreachable",
      "claimed",
      "whatsapp_invite",
    ],
  },
  notes: { type: String },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: { type: Date, default: Date.now },
});

LandlordOutreachEventSchema.index({ landlordId: 1 });

const LandlordOutreachEvent =
  mongoose.models.LandlordOutreachEvent ||
  mongoose.model("LandlordOutreachEvent", LandlordOutreachEventSchema);

export default LandlordOutreachEvent;
