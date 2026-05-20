import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession, NextAuthOptions } from "next-auth";

import { authOptions } from "@/lib/auth";
import { uploadToMega } from "@/lib/mega";

type UploadWindow = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var _serviceProviderUploadRateLimit: Map<string, UploadWindow> | undefined;
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_UPLOADS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const rateLimitStore = global._serviceProviderUploadRateLimit ?? new Map<string, UploadWindow>();
global._serviceProviderUploadRateLimit = rateLimitStore;

function isRateLimited(clientKey: string, now: number) {
  const current = rateLimitStore.get(clientKey);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= MAX_UPLOADS_PER_WINDOW) {
    return true;
  }

  rateLimitStore.set(clientKey, {
    ...current,
    count: current.count + 1,
  });
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as NextAuthOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const clientKey = session.user?.id ?? session.user?.email ?? "unknown";
    if (isRateLimited(clientKey, now)) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
          },
        },
      );
    }

    const formData = await request.formData();
    const entries = formData.getAll("file");
    if (entries.length !== 1) {
      return NextResponse.json(
        { error: "Upload exactly one image per request." },
        { status: 400 },
      );
    }

    const [file] = entries;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    const ext = file.name?.split(".").pop() || "jpg";
    const renamed = `service-provider-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToMega(buffer, renamed, "service-providers");

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Service provider upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
