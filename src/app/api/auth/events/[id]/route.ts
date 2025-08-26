import { NextRequest } from "next/server";
import { handleUpdateEvent, handleDeleteEvent } from "@/controllers/auth/eventsController";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handleUpdateEvent(req, params.id);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handleDeleteEvent(params.id);
}
