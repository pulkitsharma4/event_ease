import { NextRequest, NextResponse } from "next/server";
import { getAllEventsHttp } from "@/controllers/guest/eventsController";

export async function GET(req: NextRequest) {
  const { status, body } = await getAllEventsHttp(req);
  return NextResponse.json(body, { status });
}
