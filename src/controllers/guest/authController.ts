// src/controllers/guest/authController.ts
import type { NextRequest } from "next/server";
import * as authService from "@/services/authService";

type OkBody = {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "staff" | "admin";
    emailVerified: boolean;
    phoneVerified: boolean;
  };
};
type ErrBody = {
  success: false;
  error: "INVALID_INPUT" | "EMAIL_TAKEN" | "INTERNAL_ERROR";
};
type ControllerResult = { status: number; body: OkBody | ErrBody };

/** Pure controller (callable from API route or tests) */
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ControllerResult> {
  const result = await authService.signup(input);

  if (result.success) {
    return { status: 201, body: result };
  }

  const status =
    result.error === "INVALID_INPUT" ? 400 :
    result.error === "EMAIL_TAKEN" ? 409 :
    500;

  return { status, body: { success: false, error: result.error } };
}

/** HTTP adapter for Next.js route handlers */
export async function signupHttp(req: NextRequest): Promise<ControllerResult> {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return { status: 400, body: { success: false, error: "INVALID_INPUT" } };
  }
  const { name = "", email = "", password = "" } = payload ?? {};
  return signup({ name, email, password });
}

type LoginOk = {
  success: true;
  user: { id: string; name: string; email: string; role: "owner" | "staff" | "admin" };
};
type LoginErr = { success: false; error: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "INTERNAL_ERROR" };
type CResult = { status: number; body: LoginOk | LoginErr };

export async function login(input: { email: string; password: string }): Promise<CResult> {
  const res = await authService.login(input);
  if (res.success) return { status: 200, body: res };
  const status =
    res.error === "INVALID_INPUT" ? 400 :
    res.error === "INVALID_CREDENTIALS" ? 401 :
    500;
  return { status, body: { success: false, error: res.error } };
}

// ---- login (HTTP adapter) ----
export async function loginHttp(req: NextRequest): Promise<CResult> {
  let payload: any;
  try { payload = await req.json(); }
  catch { return { status: 400, body: { success: false, error: "INVALID_INPUT" } }; }

  const { email = "", password = "" } = payload ?? {};
  return login({ email, password });
}
