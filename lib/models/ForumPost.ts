import mongoose, { Schema } from "mongoose";

const EntityRefSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["listing", "landlord", "location", "amenity", "service_provider"],
    },
    id: { type: String },
  },
  { _id: false },
);

const ForumPostSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "houses",
        "landlords",
        "locations",
        "amenities",
        "service_providers",
        "services",
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    entityRef: { type: EntityRefSchema },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reportCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { timestamps: true },
);

ForumPostSchema.index({ category: 1 });
ForumPostSchema.index({ "entityRef.id": 1 });

const ForumPost =
  mongoose.models.ForumPost || mongoose.model("ForumPost", ForumPostSchema);

export default ForumPost;
