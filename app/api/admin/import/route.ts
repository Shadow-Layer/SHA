import crypto from "node:crypto";

import bcrypt from "bcryptjs";
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureUniquePlaceholderEmail(phoneDigits: string) {
  const base = createPlaceholderEmail(phoneDigits).replace("@sha.internal", "");
  let candidate = `${base}@sha.internal`;
  let suffix = 1;

  for (;;) {
    const existing = await User.findOne({ email: candidate })
      .select({ _id: 1 })
      .lean()
      .exec();

    if (!existing) {
      return candidate;
    }

    candidate = `${base}_${suffix}@sha.internal`;
    suffix += 1;
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

  const errors: ImportError[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

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

    const duplicate = await User.findOne({
      source: "pdf_import",
      $or: [
        { phone },
        {
          email: {
            $regex: `^landlord_${escapeRegex(phoneDigits)}(?:_\\d+)?@sha\\.internal$`,
            $options: "i",
          },
        },
      ],
    })
      .select({ _id: 1 })
      .lean()
      .exec();

    if (duplicate) {
      skipped += 1;
      continue;
    }

    let createdUserId: string | null = null;
    let createdUserThisRow = false;

    try {
      const placeholderEmail = await ensureUniquePlaceholderEmail(phoneDigits);
      const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 12);

      const user = await User.create({
        name: ownerName || "Imported landlord",
        email: placeholderEmail,
        hashedPassword,
        role: "landlord",
        phone,
        source: "pdf_import",
        inviteStatus: "imported",
        contactStatus: "not_contacted",
        isInvited: false,
        onboardingCompleted: false,
      });

      createdUserId = String(user._id);
      createdUserThisRow = true;

      await Listing.create({
        landlordId: user._id,
        title: `Student Accommodation, ${area}`,
        area,
        landmark,
        capacity: parseCapacity(row.capacity),
        amenities: parseAmenities(utilities),
        tenantPreferences: mapTenantPreferences(row.genderPreference),
        status: "imported_draft",
        source: "pdf_import",
        importBatchId: batchId,
        rawImportedText: JSON.stringify(row),
        importNotes: utilities,
        pricingDisplayText: rentalCharges,
        pricingPeriod: parsePricingPeriod(rentalCharges || ""),
        seedConfidence: "low",
        publiclyVisible: false,
        landlordConsentConfirmed: false,
        completedByLandlord: false,
      });

      successful += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        row: index,
        reason: error instanceof Error ? error.message : "Unable to import row.",
      });

      if (createdUserThisRow && createdUserId) {
        await User.deleteOne({ _id: createdUserId }).exec();
      }
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
