import crypto from "node:crypto";
import path from "node:path";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
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
const PDF_FONT_PATH = path.join(process.cwd(), "app", "fonts", "NotoSans-Regular.ttf");

function sanitizePdfText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function createTracer() {
  const trace: string[] = [];
  const log = (message: string) => {
    trace.push(message);
    console.log(`[whatsapp-pdf] ${message}`);
  };
  const warn = (message: string) => {
    trace.push(`WARN: ${message}`);
    console.log(`[whatsapp-pdf] WARN: ${message}`);
  };
  const error = (message: string) => {
    trace.push(`ERROR: ${message}`);
    console.error(`[whatsapp-pdf] ERROR: ${message}`);
  };
  return { trace, log, warn, error };
}

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

    doc.registerFont("NotoSans", PDF_FONT_PATH);
    doc.font("NotoSans");
    doc.fontSize(18).text("SHA Bulk WhatsApp PDF Export", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6b7280");
    doc.text(`Batch ID: ${sanitizePdfText(batchId)}`);
    doc.text(`Generated at: ${new Date().toISOString()}`);
    doc.text(`Selected landlords: ${items.length}`);
    doc.moveDown();
    doc.fillColor("#111827");

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.fontSize(15).text(sanitizePdfText(item.name));
      doc.moveDown(0.25);
      doc.fontSize(11).fillColor("#374151");
      doc.text(`Phone: ${sanitizePdfText(item.phone || "No phone number on file")}`);
      doc.text(`Area: ${sanitizePdfText(item.area || "-")}`);
      doc.text(`Listing: ${sanitizePdfText(item.listingTitle || "-")}`);
      doc.moveDown(0.5);
      doc.fillColor("#111827");
      doc.fontSize(12).text("WhatsApp message preview:");
      doc.fontSize(10).fillColor("#374151");
      doc.text(sanitizePdfText(item.message), { width: 500 });
      doc.moveDown(0.5);
      doc.fillColor("#111827");
      doc.fontSize(12).text("Claim URL:");
      doc.fontSize(10).fillColor("#2563eb");
      doc.text(sanitizePdfText(item.claimUrl), { width: 500 });
      doc.moveDown(0.25);
      doc.fillColor("#374151");
      doc.text(
        sanitizePdfText(
          item.whatsappUrl ? `WhatsApp URL: ${item.whatsappUrl}` : "WhatsApp URL: unavailable",
        ),
      );
    });

    doc.end();
  });
}

export async function POST(request: NextRequest) {
  const tracer = createTracer();
  tracer.log("request received");

  const session = await getAuthSession();
  if (!session?.user) {
    tracer.warn("unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    tracer.warn(`forbidden request from non-admin user userId=${session.user.id} role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: RouteBody = {};
  try {
    body = (await request.json()) as RouteBody;
  } catch {
    body = {};
  }

  const userIds = readBody(body);
  tracer.log(
    `parsed request body userIdsCount=${userIds.length} batchId=${body.batchId?.trim() || "null"} hasCustomTemplate=${Boolean(body.messageTemplate?.trim())}`,
  );

  if (userIds.length === 0) {
    tracer.warn("request rejected: missing valid userIds");
    return NextResponse.json(
      { error: "userIds must be a non-empty array", debug: tracer.trace },
      { status: 400 },
    );
  }

  const baseUrl = resolveBaseUrl(request);
  if (!baseUrl) {
    tracer.error("missing base URL; NEXTAUTH_URL/origin/x-forwarded-host not set");
    return NextResponse.json(
      { error: "Cannot determine base URL. Set NEXTAUTH_URL.", debug: tracer.trace },
      { status: 500 },
    );
  }

  const batchId = body.batchId?.trim() || crypto.randomUUID();
  const template = body.messageTemplate?.trim() || DEFAULT_MESSAGE_TEMPLATE;
  const now = new Date();
  const createdById = mongoose.isValidObjectId(session.user.id) ? session.user.id : undefined;

  try {
    await connectDB();
    tracer.log(`connected to database batchId=${batchId} requestedCount=${userIds.length}`);

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

    tracer.log(`loaded candidate landlords requestedCount=${userIds.length} matchedCount=${users.length}`);

    if (users.length === 0) {
      tracer.warn("no imported landlords matched request");
      return NextResponse.json(
        { error: "No imported landlords found", debug: tracer.trace },
        { status: 404 },
      );
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

    tracer.log(`loaded candidate listings listingCount=${listings.length}`);

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

    tracer.log(
      `filtered eligible landlords eligibleCount=${eligibleUsers.length} rejectedCount=${users.length - eligibleUsers.length}`,
    );

    if (eligibleUsers.length === 0) {
      tracer.warn(
        `no eligible landlords for bulk PDF export requestedCount=${userIds.length} matchedCount=${users.length}`,
      );
      return NextResponse.json(
        { error: "No selected landlords are eligible for a bulk PDF export.", debug: tracer.trace },
        { status: 409 },
      );
    }

    const pdfItems: PdfItem[] = [];

    for (const user of eligibleUsers) {
      const listing = listingByLandlord.get(String(user._id));
      if (!listing) {
        tracer.warn(`skipping landlord because listing lookup failed userId=${String(user._id)}`);
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

      tracer.log(
        `updated invite state userId=${String(user._id)} hasPhone=${Boolean(phone)} listingStatus=${listing.status}`,
      );

      if (listing.status === "imported_draft") {
        await Listing.updateOne(
          { landlordId: user._id, source: "pdf_import" },
          { $set: { status: "awaiting_landlord_claim" } },
        ).exec();

        tracer.log(
          `listing moved to awaiting_landlord_claim userId=${String(user._id)} listingId=${String(listing._id)}`,
        );
      }

      await LandlordOutreachEvent.create({
        landlordId: user._id,
        listingId: listing._id,
        type: "bulk_pdf_generated",
        batchId,
        notes: `Bulk WhatsApp PDF generated by admin | phone: ${phone || "missing"} | expires: ${inviteTokenExpiresAt.toISOString()}`,
        ...(createdById ? { createdBy: createdById } : {}),
        createdAt: now,
      });

      tracer.log(`outreach event created userId=${String(user._id)} listingId=${String(listing._id)}`);

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
      tracer.warn("no PDF items prepared after processing eligible landlords");
      return NextResponse.json(
        { error: "No selected landlords could be prepared for PDF export.", debug: tracer.trace },
        { status: 409 },
      );
    }

    tracer.log(`building pdf buffer itemCount=${pdfItems.length} batchId=${batchId}`);
    const pdfBuffer = await buildPdfBuffer(pdfItems, batchId);
    const pdfBytes = new Uint8Array(pdfBuffer);

    tracer.log(
      `pdf export completed batchId=${batchId} exportCount=${pdfItems.length} byteLength=${pdfBytes.byteLength}`,
    );

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
  } catch (error) {
    tracer.error(
      `export failed message=${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Unable to generate bulk WhatsApp PDF.", debug: tracer.trace },
      { status: 500 },
    );
  }
}
