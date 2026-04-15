import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const area = typeof body.area === "string" ? body.area.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!area) {
    return NextResponse.json({ error: "Area is required" }, { status: 400 });
  }

  await connectDB();

  const lead = await Lead.create({
    title,
    area,
    landmark: typeof body.landmark === "string" ? body.landmark.trim() || undefined : undefined,
    contactHint:
      typeof body.contactHint === "string" ? body.contactHint.trim() || undefined : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
    submitterEmail:
      typeof body.submitterEmail === "string" ? body.submitterEmail.trim() || undefined : undefined,
    status: "new",
  });

  return NextResponse.json({ id: String(lead._id), status: lead.status }, { status: 201 });
}
