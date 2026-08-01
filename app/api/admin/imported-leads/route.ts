import { NextRequest, NextResponse } from "next/server";

import {
  getImportedLeadRows,
  normalizeImportedLeadFilter,
} from "@/lib/admin/imported-leads";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filterValue =
    request.nextUrl.searchParams.get("contactStatus") ??
    request.nextUrl.searchParams.get("status");

  await connectDB();

  const items = await getImportedLeadRows(normalizeImportedLeadFilter(filterValue));

  return NextResponse.json({ items });
}
