import { NextRequest } from "next/server";
import { handleGetEventStats } from "@/controllers/auth/eventsController";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handleGetEventStats(req, params.id);
}
