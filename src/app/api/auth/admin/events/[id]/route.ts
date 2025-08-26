// app/api/auth/admin/events/[id]/route.ts
import { NextRequest } from "next/server";
import { handleDeleteEvent } from "@/controllers/adminController";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handleDeleteEvent(req, params);
}
