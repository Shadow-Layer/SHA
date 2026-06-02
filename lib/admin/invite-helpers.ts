import type { NextRequest } from "next/server";

export function resolveBaseUrl(request: NextRequest): string | null {
  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`.replace(/\/$/, "");
  }

  return null;
}

export function buildLandlordClaimUrl(baseUrl: string, rawToken: string): string {
  return `${baseUrl.replace(/\/$/, "")}/claim/${rawToken}`;
}

