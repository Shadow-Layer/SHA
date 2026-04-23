import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ImportJob from "@/lib/models/ImportJob";
import ServiceProvider from "@/lib/models/ServiceProvider";
import {
  normalizeFreeText,
  normalizePhoneDigits,
  normalizeSPCategory,
  type SPImportRow,
} from "@/lib/pdf-import";

type ImportBody = {
  rows?: SPImportRow[];
  sourceFileName?: string;
};

type ImportError = {
  row: number;
  reason: string;
};

type PreparedServiceProviderRow = {
  rowIndex: number;
  document: Record<string, unknown>;
};

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ImportBody;

  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) {
    return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
  }

  const batchId = crypto.randomUUID();
  const sourceFileName =
    typeof body.sourceFileName === "string" && body.sourceFileName.trim()
      ? body.sourceFileName.trim()
      : "manual-paste.json";

  await connectDB();

  const existingProviders = await ServiceProvider.find({})
    .select({ phone: 1 })
    .lean()
    .exec();

  const existingPhoneDigits = new Set<string>();
  for (const provider of existingProviders) {
    if (typeof provider.phone !== "string" || !provider.phone.trim()) {
      continue;
    }

    const phoneDigits = normalizePhoneDigits(provider.phone);
    if (phoneDigits) {
      existingPhoneDigits.add(phoneDigits);
    }
  }

  const errors: ImportError[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const preparedRows: PreparedServiceProviderRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const businessName = normalizeFreeText(row.businessName);
    const phone = normalizeFreeText(row.phone);

    if (!businessName) {
      failed += 1;
      errors.push({ row: index, reason: "Business name is required." });
      continue;
    }

    if (!phone) {
      failed += 1;
      errors.push({ row: index, reason: "Phone number is required." });
      continue;
    }

    const phoneDigits = normalizePhoneDigits(phone);
    if (!phoneDigits) {
      failed += 1;
      errors.push({ row: index, reason: "Phone number is required." });
      continue;
    }

    if (existingPhoneDigits.has(phoneDigits)) {
      skipped += 1;
      continue;
    }

    preparedRows.push({
      rowIndex: index,
      document: {
        businessName,
        phone,
        contactName: normalizeFreeText(row.contactName) || undefined,
        category: normalizeSPCategory(row.category),
        areasServed: normalizeFreeText(row.areasServed) || undefined,
        description: normalizeFreeText(row.description) || undefined,
        priceRange: normalizeFreeText(row.priceRange) || undefined,
        email: normalizeFreeText(row.email).toLowerCase() || undefined,
        preferredContact: "whatsapp",
        availability: "on_request",
        targetCustomers: "both",
        status: "unclaimed",
        source: "pdf_import",
        importBatchId: batchId,
        userId: null,
        consentGiven: false,
        contactStatus: "not_contacted",
      },
    });

    existingPhoneDigits.add(phoneDigits);
  }

  if (preparedRows.length > 0) {
    try {
      await ServiceProvider.insertMany(
        preparedRows.map((preparedRow) => preparedRow.document),
        { ordered: true },
      );
      successful += preparedRows.length;
    } catch (error) {
      failed += preparedRows.length;
      errors.push({
        row: preparedRows[0]?.rowIndex ?? 0,
        reason: error instanceof Error ? error.message : "Unable to import rows.",
      });
    }
  }

  await ImportJob.create({
    batchId,
    sourceFileName,
    createdBy: session.user.id,
    totalRows: rows.length,
    successfulRows: successful,
    failedRows: failed,
    notes: skipped > 0 ? `${skipped} duplicate row(s) skipped.` : undefined,
  });

  return NextResponse.json({
    batchId,
    total: rows.length,
    successful,
    skipped,
    failed,
    errors,
  });
}
