import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import { toAdminServiceProviderRow } from "@/lib/service-providers";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  await connectDB();

  const session = await getAuthSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid service provider id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== "published" && body.status !== "removed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const provider = await ServiceProvider.findByIdAndUpdate(
    params.id,
    { status: body.status },
    { new: true },
  )
    .lean()
    .exec();

  if (!provider) {
    return NextResponse.json({ error: "Service provider not found" }, { status: 404 });
  }

  return NextResponse.json({
    provider: toAdminServiceProviderRow(provider as Record<string, unknown>),
  });
}
