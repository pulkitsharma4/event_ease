import { NextRequest, NextResponse } from "next/server";
import { getHome } from "@/controllers/guest/homeController"; // ensure controllers live under src/

export async function GET(req: NextRequest) {
  const { status, body } = await getHome(req);
  return NextResponse.json(body, { status });
}
