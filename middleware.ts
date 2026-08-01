import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function redirectToLogin(req: NextRequest) {
  const callbackUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return redirectToLogin(req);
  }

  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard/landlord") && token.role !== "landlord") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard/student") && token.role !== "student") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard/provider") && token.role !== "service_provider") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/forum/:path*", "/inbox/:path*", "/admin/:path*"],
};
