import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ImportJob from "@/lib/models/ImportJob";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";
import {
  createPlaceholderEmail,
  mapTenantPreferences,
  normalizeFreeText,
  normalizePhoneDigits,
  parseAmenities,
  parseCapacity,
  parsePricingPeriod,
  splitImportedAddress,
  type ImportRow,
} from "@/lib/pdf-import";

type ImportBody = {
  rows?: ImportRow[];
  sourceFileName?: string;
};

type ImportError = {
  row: number;
  reason: string;
};

type PreparedImportRow = {
  rowIndex: number;
  phone: string;
  placeholderEmail: string;
  ownerName: string;
  utilities: string;
  rentalCharges: string;
  area: string;
  landmark: string;
  userId: mongoose.Types.ObjectId;
  row: ImportRow;
};

export const maxDuration = 60;

function getPlaceholderEmailBase(phoneDigits: string) {
  return createPlaceholderEmail(phoneDigits).replace("@sha.internal", "");
}

function getPlaceholderEmailSuffixByBase(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const match = normalizedEmail.match(/^(landlord_[a-z0-9]+)(?:_(\d+))?@sha\.internal$/i);

  if (!match) {
    return null;
  }

  return {
    base: match[1].toLowerCase(),
    suffix: match[2] ? Number.parseInt(match[2], 10) : 0,
  };
}

function allocatePlaceholderEmail(
  phoneDigits: string,
  nextEmailSuffixByBase: Map<string, number>,
) {
  const base = getPlaceholderEmailBase(phoneDigits).toLowerCase();
  const nextSuffix = nextEmailSuffixByBase.get(base) ?? 0;
  const email = nextSuffix === 0 ? `${base}@sha.internal` : `${base}_${nextSuffix}@sha.internal`;

  nextEmailSuffixByBase.set(base, nextSuffix + 1);

  return email;
}

function releasePlaceholderEmail(email: string, nextEmailSuffixByBase: Map<string, number>) {
  const placeholder = getPlaceholderEmailSuffixByBase(email);
  if (!placeholder) {
    return;
  }

  const expectedNextSuffix = placeholder.suffix + 1;
  if (nextEmailSuffixByBase.get(placeholder.base) === expectedNextSuffix) {
    nextEmailSuffixByBase.set(placeholder.base, placeholder.suffix);
  }
}

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

  const existingImportedUsers = await User.find({ source: "pdf_import" })
    .select({ phone: 1, email: 1 })
    .lean()
    .exec();

  const errors: ImportError[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const existingImportedPhoneDigits = new Set<string>();
  const existingPlaceholderEmailBases = new Set<string>();
  const nextEmailSuffixByBase = new Map<string, number>();

  for (const existingImportedUser of existingImportedUsers) {
    if (typeof existingImportedUser.phone === "string" && existingImportedUser.phone.trim()) {
      const existingPhoneDigits = normalizePhoneDigits(existingImportedUser.phone);
      if (existingPhoneDigits) {
        existingImportedPhoneDigits.add(existingPhoneDigits);
      }
    }

    if (typeof existingImportedUser.email === "string") {
      const placeholder = getPlaceholderEmailSuffixByBase(existingImportedUser.email);
      if (!placeholder) {
        continue;
      }

      existingPlaceholderEmailBases.add(placeholder.base);
      const nextSuffix = placeholder.suffix + 1;
      const currentNextSuffix = nextEmailSuffixByBase.get(placeholder.base) ?? 0;
      if (nextSuffix > currentNextSuffix) {
        nextEmailSuffixByBase.set(placeholder.base, nextSuffix);
      }
    }
  }

  const placeholderPasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);
  const preparedRows: PreparedImportRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const ownerName = normalizeFreeText(row.ownerName);
    const phone = normalizeFreeText(row.phone);
    const phoneDigits = normalizePhoneDigits(phone);
    const utilities = normalizeFreeText(row.utilities);
    const rentalCharges = normalizeFreeText(row.rentalCharges);
    const { area, landmark } = splitImportedAddress(row.address || "", row.area);

    if (!phoneDigits) {
      failed += 1;
      errors.push({ row: index, reason: "Phone number is required." });
      continue;
    }

    const placeholderEmailBase = getPlaceholderEmailBase(phoneDigits).toLowerCase();

    if (
      existingImportedPhoneDigits.has(phoneDigits) ||
      existingPlaceholderEmailBases.has(placeholderEmailBase)
    ) {
      skipped += 1;
      continue;
    }

    const placeholderEmail = allocatePlaceholderEmail(phoneDigits, nextEmailSuffixByBase);

    preparedRows.push({
      rowIndex: index,
      phone,
      placeholderEmail,
      ownerName,
      utilities,
      rentalCharges,
      area,
      landmark,
      userId: new mongoose.Types.ObjectId(),
      row,
    });

    existingImportedPhoneDigits.add(phoneDigits);
    existingPlaceholderEmailBases.add(placeholderEmailBase);
  }

  if (preparedRows.length > 0) {
    try {
      await User.insertMany(
        preparedRows.map((item) => ({
          _id: item.userId,
          name: item.ownerName || "Imported landlord",
          email: item.placeholderEmail,
          hashedPassword: placeholderPasswordHash,
          role: "landlord",
          phone: item.phone,
          source: "pdf_import",
          inviteStatus: "imported",
          contactStatus: "not_contacted",
          isInvited: false,
          onboardingCompleted: false,
        })),
        { ordered: true },
      );

      await Listing.insertMany(
        preparedRows.map((item) => ({
          landlordId: item.userId,
          title: `Student Accommodation, ${item.area}`,
          area: item.area,
          landmark: item.landmark,
          capacity: parseCapacity(item.row.capacity),
          amenities: parseAmenities(item.utilities),
          tenantPreferences: mapTenantPreferences(item.row.genderPreference),
          status: "imported_draft",
          source: "pdf_import",
          importBatchId: batchId,
          rawImportedText: JSON.stringify(item.row),
          importNotes: item.utilities,
          pricingDisplayText: item.rentalCharges,
          pricingPeriod: parsePricingPeriod(item.rentalCharges || ""),
          seedConfidence: "low",
          publiclyVisible: false,
          landlordConsentConfirmed: false,
          completedByLandlord: false,
        })),
        { ordered: true },
      );

      successful += preparedRows.length;
    } catch (error) {
      await User.deleteMany({
        _id: { $in: preparedRows.map((item) => item.userId) },
      }).exec();

      for (const preparedRow of preparedRows) {
        releasePlaceholderEmail(preparedRow.placeholderEmail, nextEmailSuffixByBase);
      }

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
