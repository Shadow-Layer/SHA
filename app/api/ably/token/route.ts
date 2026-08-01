import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { createAblyTokenRequest, getAblyApiKey } from "@/lib/ably";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getAblyApiKey()) {
    return NextResponse.json({ error: "Ably is not configured" }, { status: 503 });
  }

  try {
    const tokenRequest = await createAblyTokenRequest(session.user.id);
    if (!tokenRequest) {
      return NextResponse.json({ error: "Ably is not configured" }, { status: 503 });
    }

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to create Ably token request", error);
    return NextResponse.json({ error: "Unable to create Ably token request" }, { status: 500 });
  }
}
