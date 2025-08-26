// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "eventease_session";
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await verifySessionToken(token); // throws if invalid/expired
    return NextResponse.next();
  } catch {
    // bad/expired token -> clear path by sending to login
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Protect all dashboard routes
export const config = {
  matcher: ["/dashboard/:path*"],
};
