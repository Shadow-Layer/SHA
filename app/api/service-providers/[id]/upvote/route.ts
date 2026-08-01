import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import { isValidObjectId } from "@/lib/service-provider-feedback";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  await connectDB();
  const userObjectId = new mongoose.Types.ObjectId(session.user.id);
  const provider = await ServiceProvider.findOne({ _id: params.id, status: "published" })
    .select({ _id: 1, upvotes: 1 })
    .lean()
    .exec();
  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const hasUpvoted = Array.isArray(provider.upvotes)
    ? provider.upvotes.some((upvote: mongoose.Types.ObjectId) => String(upvote) === session.user?.id)
    : false;

  const updatedProvider = hasUpvoted
    ? await ServiceProvider.findOneAndUpdate(
        { _id: params.id, status: "published", upvotes: userObjectId },
        { $pull: { upvotes: userObjectId } },
        { new: true, projection: { upvotes: 1 } },
      )
        .lean()
        .exec()
    : await ServiceProvider.findOneAndUpdate(
        { _id: params.id, status: "published", upvotes: { $ne: userObjectId } },
        { $addToSet: { upvotes: userObjectId } },
        { new: true, projection: { upvotes: 1 } },
      )
        .lean()
        .exec();

  const authoritativeProvider =
    updatedProvider ||
    (await ServiceProvider.findOne({ _id: params.id, status: "published" })
      .select({ upvotes: 1 })
      .lean()
      .exec());

  if (!authoritativeProvider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  const upvoted = Array.isArray(authoritativeProvider.upvotes)
    ? authoritativeProvider.upvotes.some(
        (upvote: mongoose.Types.ObjectId) => String(upvote) === session.user?.id,
      )
    : false;
  const count = Array.isArray(authoritativeProvider.upvotes)
    ? authoritativeProvider.upvotes.length
    : 0;

  return NextResponse.json({ upvoted, count });
}
