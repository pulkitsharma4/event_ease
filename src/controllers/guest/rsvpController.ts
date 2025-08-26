import type { NextRequest } from "next/server";
import * as rsvpService from "@/services/rsvpService";

type OkBody = { success: true; rsvpId: string; remainingAfter: number };
type ErrBody = { success: false; error: "INVALID_INPUT" | "INSUFFICIENT_SPOTS" | "EVENT_PAST" | "ALREADY_RSVPED" | "INTERNAL_ERROR" };
type ControllerResult = { status: number; body: OkBody | ErrBody };

/** Shape expected from the client form */
export type CreateRsvpBody = {
  eventId: string;
  name: string;
  email: string;
  mobile?: string;   // optional, not persisted yet
  quantity: number;
};

/** Pure controller function (can be called from API route or tests) */
export async function createRsvp(input: CreateRsvpBody): Promise<ControllerResult> {
  // Basic validation (keep lightweight; service will re-validate)
  const eventId = (input.eventId ?? "").trim();
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));

  if (!eventId || !name || !email || quantity < 1) {
    return { status: 400, body: { success: false, error: "INVALID_INPUT" } };
  }

  // Call service (currently: eventId, name, email, quantity).
  // Note: 'mobile' is accepted here but not persisted yet; we can add it to the model/service next if you want to store it.
  const result = await rsvpService.createRsvp({ eventId, name, email, quantity });

  if (result.success) {
    return { status: 201, body: { success: true, rsvpId: result.rsvpId, remainingAfter: result.remainingAfter } };
  }

  const code = result.error;
  const status =
    code === "INVALID_INPUT" ? 400 :
    code === "ALREADY_RSVPED" ? 409 :
    code === "INSUFFICIENT_SPOTS" ? 409 :
    code === "EVENT_PAST" ? 409 :
    500;

  return { status, body: { success: false, error: code } };
}

/** Adapter for Next.js API routes */
export async function createRsvpHttp(req: NextRequest): Promise<ControllerResult> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return { status: 400, body: { success: false, error: "INVALID_INPUT" } };
  }
  return createRsvp(payload as CreateRsvpBody);
}
