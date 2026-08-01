import { NextRequest, NextResponse } from "next/server";
import { getServerSession, NextAuthOptions } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToMega } from "@/lib/mega";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as NextAuthOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const ext = file.name?.split(".").pop() || "jpg";
    const renamed = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToMega(buffer, renamed, "listings");

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Listing upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
