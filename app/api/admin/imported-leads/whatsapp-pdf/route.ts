import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { NextRequest, NextResponse } from "next/server";

import { resolveBaseUrl, buildLandlordClaimUrl } from "@/lib/admin/invite-helpers";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LandlordOutreachEvent from "@/lib/models/LandlordOutreachEvent";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";
import { appendClaimLink, buildWhatsAppLink } from "@/lib/whatsapp";

type RouteBody = {
  userIds?: string[];
  messageTemplate?: string;
  batchId?: string;
};

type PdfItem = {
  userId: string;
  name: string;
  phone: string;
  claimUrl: string;
  message: string;
  whatsappUrl: string | null;
  listingTitle: string;
  area: string;
};

const DEFAULT_MESSAGE_TEMPLATE =
  "Hello {landlordName}, this is Student Housing Archive. We imported your rental listing details so students can find verified housing more easily. Please claim your landlord account and complete your listing using the secure link below:\n\n{claimLink}\n\nIf you did not expect this message, you can ignore it.";

export const runtime = "nodejs";
export const maxDuration = 60;

function readBody(body: RouteBody): string[] {
  const ids = Array.isArray(body.userIds) ? body.userIds : [];
  return ids
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => mongoose.isValidObjectId(id));
}

function buildPdfBuffer(items: PdfItem[], batchId: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text("SHA Bulk WhatsApp PDF Export", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6b7280");
    doc.text(`Batch ID: ${batchId}`);
    doc.text(`Generated at: ${new Date().toISOString()}`);
    doc.text(`Selected landlords: ${items.length}`);
    doc.moveDown();
    doc.fillColor("#111827");

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.fontSize(15).text(item.name);
      doc.moveDown(0.25);
      doc.fontSize(11).fillColor("#374151");
      doc.text(`Phone: ${item.phone || "No phone number on file"}`);
      doc.text(`Area: ${item.area || "-"}`);
      doc.text(`Listing: ${item.listingTitle || "-"}`);
      doc.moveDown(0.5);
      doc.fillColor("#111827");
      doc.fontSize(12).text("WhatsApp message preview:");
      doc.fontSize(10).fillColor("#374151");
      doc.text(item.message, { width: 500 });
      doc.moveDown(0.5);
      doc.fillColor("#111827");
      doc.fontSize(12).text("Claim URL:");
      doc.fontSize(10).fillColor("#2563eb");
      doc.text(item.claimUrl, { width: 500 });
      doc.moveDown(0.25);
      doc.fillColor("#374151");
      doc.text(item.whatsappUrl ? `WhatsApp URL: ${item.whatsappUrl}` : "WhatsApp URL: unavailable");
    });

    doc.end();
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: RouteBody = {};
  try {
    body = (await request.json()) as RouteBody;
  } catch {
    body = {};
  }

  const userIds = readBody(body);
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds must be a non-empty array" }, { status: 400 });
  }

  const baseUrl = resolveBaseUrl(request);
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Cannot determine base URL. Set NEXTAUTH_URL." },
      { status: 500 },
    );
  }

  const batchId = body.batchId?.trim() || crypto.randomUUID();
  const template = body.messageTemplate?.trim() || DEFAULT_MESSAGE_TEMPLATE;
  const now = new Date();

  await connectDB();

  const users = await User.find({
    _id: { $in: userIds },
    role: "landlord",
    source: "pdf_import",
  })
    .select({
      _id: 1,
      name: 1,
      phone: 1,
      inviteStatus: 1,
      onboardingCompleted: 1,
    })
    .lean()
    .exec();

  if (users.length === 0) {
    return NextResponse.json({ error: "No imported landlords found" }, { status: 404 });
  }

  const listings = await Listing.find({
    landlordId: { $in: users.map((user) => user._id) },
    source: "pdf_import",
  })
    .sort({ createdAt: -1 })
    .select({
      _id: 1,
      landlordId: 1,
      title: 1,
      area: 1,
      status: 1,
    })
    .lean()
    .exec();

  const listingByLandlord = new Map<
    string,
    { _id: mongoose.Types.ObjectId | string; title: string; area: string; status: string }
  >();
  for (const listing of listings) {
    const landlordId = String(listing.landlordId);
    if (!listingByLandlord.has(landlordId)) {
      listingByLandlord.set(landlordId, {
        _id: listing._id,
        title: listing.title,
        area: listing.area,
        status: listing.status,
      });
    }
  }

  const eligibleUsers = users.filter((user) => {
    const listing = listingByLandlord.get(String(user._id));
    return (
      listing &&
      !["claimed", "onboarded"].includes(user.inviteStatus || "") &&
      ["imported_draft", "awaiting_landlord_claim"].includes(listing.status)
    );
  });

  if (eligibleUsers.length === 0) {
    return NextResponse.json(
      { error: "No selected landlords are eligible for a bulk PDF export." },
      { status: 409 },
    );
  }

  const pdfItems: PdfItem[] = [];

  for (const user of eligibleUsers) {
    const listing = listingByLandlord.get(String(user._id));
    if (!listing) {
      continue;
    }

    const phone = user.phone?.trim() || "";
    const rawToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = await bcrypt.hash(rawToken, 10);
    const inviteTokenExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const claimUrl = buildLandlordClaimUrl(baseUrl, rawToken);
    const landlordName = user.name?.trim() || "there";
    const interpolated = template
      .replace(/\{landlordName\}/g, landlordName)
      .replace(/\{claimLink\}/g, claimUrl);
    const finalMessage = appendClaimLink(interpolated, claimUrl);
    const waResult = buildWhatsAppLink(phone, finalMessage);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          inviteTokenHash,
          inviteTokenExpiresAt,
          isInvited: true,
          inviteStatus: "invited",
        },
      },
    ).exec();

    if (listing.status === "imported_draft") {
      await Listing.updateOne(
        { landlordId: user._id, source: "pdf_import" },
        { $set: { status: "awaiting_landlord_claim" } },
      ).exec();
    }

    await LandlordOutreachEvent.create({
      landlordId: user._id,
      listingId: listing._id,
      type: "bulk_pdf_generated",
      batchId,
      notes: `Bulk WhatsApp PDF generated by admin · phone: ${phone || "missing"} · expires: ${inviteTokenExpiresAt.toISOString()}`,
      createdBy: session.user.id,
      createdAt: now,
    });

    pdfItems.push({
      userId: String(user._id),
      name: user.name?.trim() || "Imported landlord",
      phone,
      claimUrl,
      message: finalMessage,
      whatsappUrl: waResult?.whatsappUrl || null,
      listingTitle: listing.title,
      area: listing.area,
    });
  }

  if (pdfItems.length === 0) {
    return NextResponse.json(
      { error: "No selected landlords could be prepared for PDF export." },
      { status: 409 },
    );
  }

  const pdfBuffer = await buildPdfBuffer(pdfItems, batchId);
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"sha-whatsapp-pdf-${batchId}.pdf\"`,
      "Cache-Control": "no-store",
      "X-Batch-Id": batchId,
      "X-Export-Count": String(pdfItems.length),
    },
  });
}
