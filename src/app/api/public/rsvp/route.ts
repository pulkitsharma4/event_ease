import { NextRequest, NextResponse } from "next/server";
import { createRsvpHttp } from "@/controllers/guest/rsvpController";

export async function POST(req: NextRequest) {
  const { status, body } = await createRsvpHttp(req);
  return NextResponse.json(body, { status });
}
