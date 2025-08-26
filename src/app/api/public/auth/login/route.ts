import { NextRequest, NextResponse } from "next/server";
import { loginHttp } from "@/controllers/guest/authController";
import { createSessionToken, buildSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const auth = await loginHttp(req);

  // Wrong creds / invalid input → forward as-is
  if (auth.status !== 200 || !("user" in auth.body)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  // Success → create JWT and set HTTP-only cookie
  const { user } = auth.body;
  const token = await createSessionToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const res = NextResponse.json({ success: true, user }, { status: 200 });
  res.cookies.set(buildSessionCookie(token));
  return res;
}
