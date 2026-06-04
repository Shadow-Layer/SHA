import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
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

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars: number): string[] {
  const normalized = sanitizePdfText(value).trim();
  if (!normalized) return [""];

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

type PdfTextRun = {
  text: string;
  size: number;
  color?: [number, number, number];
};

function buildTextStream(runs: PdfTextRun[], options: { x: number; y: number; leading?: number }): string {
  const leading = options.leading ?? 14;
  const commands: string[] = ["BT"];
  let firstLine = true;

  for (const run of runs) {
    const color = run.color ?? [0, 0, 0];
    commands.push(`${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg`);
    commands.push(`/F1 ${run.size} Tf`);

    const maxChars = Math.max(18, Math.floor(500 / (run.size * 0.55)));
    const lines = wrapText(run.text, maxChars);

    lines.forEach((line, index) => {
      if (firstLine) {
        commands.push(`1 0 0 1 ${options.x} ${options.y} Tm`);
        firstLine = false;
      } else if (index === 0) {
        commands.push(`0 -${leading} Td`);
      } else {
        commands.push(`0 -${leading} Td`);
      }
      commands.push(`(${escapePdfText(line)}) Tj`);
    });
  }

  commands.push("ET");
  return commands.join("\n");
}

function buildPageContent(title: string, subtitleLines: string[], item: PdfItem | null): string {
  const blocks: string[] = [];

  blocks.push(buildTextStream([{ text: title, size: 18 }], { x: 48, y: 780, leading: 22 }));
  blocks.push(
    buildTextStream(
      subtitleLines.map((text) => ({ text, size: 10, color: [0.42, 0.45, 0.49] })),
      { x: 48, y: 755, leading: 14 },
    ),
  );

  if (item) {
    blocks.push(
      buildTextStream(
        [
          { text: item.name, size: 15 },
          { text: `Phone: ${item.phone || "No phone number on file"}`, size: 11, color: [0.22, 0.26, 0.31] },
          { text: `Area: ${item.area || "-"}`, size: 11, color: [0.22, 0.26, 0.31] },
          { text: `Listing: ${item.listingTitle || "-"}`, size: 11, color: [0.22, 0.26, 0.31] },
          { text: "WhatsApp message preview:", size: 12 },
          { text: item.message, size: 10, color: [0.22, 0.26, 0.31] },
          { text: "Claim URL:", size: 12 },
          { text: item.claimUrl, size: 10, color: [0.15, 0.39, 0.98] },
          {
            text: item.whatsappUrl ? `WhatsApp URL: ${item.whatsappUrl}` : "WhatsApp URL: unavailable",
            size: 10,
            color: [0.22, 0.26, 0.31],
          },
        ],
        { x: 48, y: 705, leading: 15 },
      ),
    );
  } else {
    blocks.push(
      buildTextStream(
        [
          { text: "Summary", size: 12 },
          { text: `Selected landlords: ${subtitleLines[2] ?? ""}`, size: 10, color: [0.22, 0.26, 0.31] },
        ],
        { x: 48, y: 705, leading: 16 },
      ),
    );
  }

  return blocks.join("\n");
}

function buildPdfBuffer(items: PdfItem[], batchId: string): Buffer {
  const totalPages = items.length + 1;
  const totalObjects = 3 + totalPages * 2;
  const objects: string[] = new Array(totalObjects + 1).fill("");

  const summaryLines = [
    `Batch ID: ${sanitizePdfText(batchId)}`,
    `Generated at: ${new Date().toISOString()}`,
    `Selected landlords: ${items.length}`,
  ];

  const pageContentStrings = [
    buildPageContent("SHA Bulk WhatsApp PDF Export", summaryLines, null),
    ...items.map((item, index) =>
      buildPageContent(`Landlord ${index + 1} of ${items.length}`, summaryLines, item),
    ),
  ];

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${Array.from({ length: totalPages }, (_, idx) => `${4 + idx * 2} 0 R`).join(" ")}] /Count ${totalPages} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pageContentStrings.forEach((content, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const contentLength = Buffer.byteLength(content, "utf8");
    objects[contentId] = `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let position = header.length;

  for (let id = 1; id <= totalObjects; id += 1) {
    const body = objects[id];
    if (!body) {
      throw new Error(`Missing PDF object ${id}`);
    }
    const objectBuffer = Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "utf8");
    offsets.push(position);
    chunks.push(objectBuffer);
    position += objectBuffer.length;
  }

  const xrefStart = position;
  const xrefLines = ["xref", `0 ${totalObjects + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= totalObjects; id += 1) {
    xrefLines.push(`${offsets[id].toString().padStart(10, "0")} 00000 n `);
  }

  const trailer = [
    "trailer",
    `<< /Size ${totalObjects + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");

  chunks.push(Buffer.from(`${xrefLines.join("\n")}\n${trailer}\n`, "utf8"));
  return Buffer.concat(chunks);
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
    const pdfBuffer = buildPdfBuffer(pdfItems, batchId);
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
    tracer.error(`export failed message=${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Unable to generate bulk WhatsApp PDF.", debug: tracer.trace },
      { status: 500 },
    );
  }
}
