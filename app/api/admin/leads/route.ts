import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const leads = await Lead.find({})
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return NextResponse.json({
    leads: leads.map((lead) => ({
      id: String(lead._id),
      title: lead.title,
      area: lead.area,
      landmark: lead.landmark ?? "",
      contactHint: lead.contactHint ?? "",
      notes: lead.notes ?? "",
      submitterEmail: lead.submitterEmail ?? "",
      status: lead.status,
      submittedAt:
        lead.createdAt instanceof Date ? lead.createdAt.toISOString() : new Date().toISOString(),
    })),
  });
}
