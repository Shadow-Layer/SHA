import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";
import { toAdminServiceProviderRow } from "@/lib/service-providers";

const STATUSES = new Set(["pending_review", "published", "removed", "unclaimed"]);

export async function GET(request: NextRequest) {
  await connectDB();

  const session = await getAuthSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status")?.trim() || "";
  const query = status && STATUSES.has(status) ? { status } : {};

  const providers = await ServiceProvider.find(query).sort({ createdAt: -1 }).lean().exec();

  return NextResponse.json({
    providers: providers.map((provider) =>
      toAdminServiceProviderRow(provider as Record<string, unknown>),
    ),
  });
}
