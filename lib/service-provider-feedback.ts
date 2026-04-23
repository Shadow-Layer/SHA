import mongoose from "mongoose";

import ServiceProvider from "@/lib/models/ServiceProvider";
import ServiceProviderFeedback from "@/lib/models/ServiceProviderFeedback";
import User from "@/lib/models/User";

type FeedbackDocumentLike = {
  _id?: unknown;
  rating?: unknown;
  comment?: unknown;
  isAnonymous?: unknown;
  consentToReveal?: unknown;
  authorId?: unknown;
  createdAt?: unknown;
};

export type SerializedServiceProviderFeedback = {
  id?: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  authorName?: string;
  createdAt: string | null;
};

export function isValidObjectId(value: string) {
  return mongoose.isValidObjectId(value);
}

export async function recalculateServiceProviderStats(providerId: string) {
  const [stats] = await ServiceProviderFeedback.aggregate([
    {
      $match: {
        providerId: new mongoose.Types.ObjectId(providerId),
        status: "active",
      },
    },
    {
      $group: {
        _id: "$providerId",
        averageRating: { $avg: "$rating" },
        totalCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating =
    typeof stats?.averageRating === "number" && Number.isFinite(stats.averageRating)
      ? stats.averageRating
      : 0;
  const totalCount = typeof stats?.totalCount === "number" ? stats.totalCount : 0;

  await ServiceProvider.findByIdAndUpdate(providerId, {
    $set: {
      rating: averageRating,
      feedbackCount: totalCount,
    },
  }).exec();

  return { averageRating, totalCount };
}

export async function serializeFeedbackRecords(
  feedbackRecords: FeedbackDocumentLike[],
): Promise<SerializedServiceProviderFeedback[]> {
  const revealAuthorIds = Array.from(
    new Set(
      feedbackRecords
        .filter((feedback) => feedback.consentToReveal === true && feedback.authorId)
        .map((feedback) => String(feedback.authorId)),
    ),
  );

  const authors =
    revealAuthorIds.length > 0
      ? await User.find({ _id: { $in: revealAuthorIds } })
          .select({ _id: 1, name: 1 })
          .lean()
          .exec()
      : [];
  const authorMap = new Map(
    authors.map((author) => [String(author._id), typeof author.name === "string" ? author.name : ""]),
  );

  return feedbackRecords.map((feedback) => ({
    ...(feedback._id ? { id: String(feedback._id) } : {}),
    rating:
      typeof feedback.rating === "number" && Number.isFinite(feedback.rating) ? feedback.rating : 0,
    comment: typeof feedback.comment === "string" ? feedback.comment : "",
    isAnonymous: feedback.isAnonymous !== false,
    ...(feedback.consentToReveal === true && feedback.authorId
      ? { authorName: authorMap.get(String(feedback.authorId)) || undefined }
      : {}),
    createdAt:
      feedback.createdAt instanceof Date
        ? feedback.createdAt.toISOString()
        : typeof feedback.createdAt === "string"
          ? feedback.createdAt
          : null,
  }));
}
