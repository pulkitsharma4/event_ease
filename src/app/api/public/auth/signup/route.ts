import { NextRequest, NextResponse } from "next/server";
import { signupHttp } from "@/controllers/guest/authController";

export async function POST(req: NextRequest) {
  const { status, body } = await signupHttp(req);
  return NextResponse.json(body, { status });
}
