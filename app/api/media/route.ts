import path from "node:path";

import { File } from "megajs";
import { NextRequest, NextResponse } from "next/server";

import { isMegaShareUrl } from "@/lib/media";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function guessContentType(filename: string | null | undefined) {
  if (!filename) {
    return "application/octet-stream";
  }

  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");

  if (!src || !isMegaShareUrl(src)) {
    return NextResponse.json({ error: "Invalid media source" }, { status: 400 });
  }

  try {
    const file = File.fromURL(src);
    await file.loadAttributes();
    const buffer = await file.downloadBuffer({});

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
        "Content-Type": guessContentType(file.name),
      },
    });
  } catch (error) {
    console.error("Failed to proxy MEGA media", error);
    return NextResponse.json({ error: "Unable to load media" }, { status: 502 });
  }
}
