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

  if (!src) {
    return NextResponse.json({ error: "Missing media source" }, { status: 400 });
  }

  // Handle MEGA.nz URLs
  if (isMegaShareUrl(src)) {
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

  // Handle local file paths (strip leading slash if present)
  const localPath = src.startsWith("/") ? src.slice(1) : src;
  const filePath = path.join(process.cwd(), "public", localPath);
  const normalizedPath = path.normalize(filePath);
  const publicDir = path.normalize(path.join(process.cwd(), "public"));

  // Security: ensure path is within public directory
  if (!normalizedPath.startsWith(publicDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(normalizedPath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
        "Content-Type": guessContentType(normalizedPath),
      },
    });
  } catch (error) {
    console.error("Failed to load local media", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
