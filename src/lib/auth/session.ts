import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/models/User";

const enc = new TextEncoder();

/* env helpers */
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return enc.encode(s);
}
function getCookieName(): string {
  const n = process.env.AUTH_COOKIE_NAME;
  if (!n) throw new Error("AUTH_COOKIE_NAME is not set");
  return n;
}
function getMaxAgeSec(): number {
  const days = Math.max(1, Math.floor(Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS ?? "7")));
  return days * 24 * 60 * 60;
}

/* session claims */
export type SessionClaims = {
  sub: string;
  role: UserRole;  // "owner" | "staff" | "admin"
  name: string;
  email: string;
};

/* sign / verify */
export async function createSessionToken(claims: SessionClaims): Promise<string> {
  const maxAge = getMaxAgeSec();
  return new SignJWT({ role: claims.role, name: claims.name, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  const sub = payload.sub as string | undefined;
  const role = payload.role as UserRole | undefined;
  const name = (payload.name as string | undefined) ?? "";
  const email = payload.email as string | undefined;
  if (!sub || !role || !email) throw new Error("Invalid session");
  return { sub, role, name, email };
}

/* read cookie (readonly store is fine) */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(getCookieName())?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/* helpers to apply cookies in a route handler (NextResponse) */
export function buildSessionCookie(token: string) {
  return {
    name: getCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getMaxAgeSec(),
  };
}

export function buildClearSessionCookie() {
  return {
    name: getCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}