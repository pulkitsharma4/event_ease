// src/controllers/healthController.ts
import { NextResponse } from "next/server";
import { getHealth } from "../services/healthService";

export async function handleHealth() {
  try {
    const status = await getHealth();
    return NextResponse.json(status, { status: 200 });
  } catch (err: any) {
    console.error("GET /health failed:", err?.message || err);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
