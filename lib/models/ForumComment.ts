import mongoose, { Schema } from "mongoose";

const ForumCommentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "ForumPost",
      required: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true },
    reportCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { timestamps: true },
);

ForumCommentSchema.index({ postId: 1 });

const ForumComment =
  mongoose.models.ForumComment || mongoose.model("ForumComment", ForumCommentSchema);

export default ForumComment;
