import { NextRequest } from "next/server";
import { handleCreateEvent } from "@/controllers/auth/eventsController";

export async function POST(req: NextRequest) {
  return handleCreateEvent(req);
}
