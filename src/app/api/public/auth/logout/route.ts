import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set(buildClearSessionCookie()); // remove HTTP-only session cookie
  return res;
}
