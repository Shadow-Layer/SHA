import mongoose, { Schema } from "mongoose";

const ConversationSchema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

export default Conversation;
