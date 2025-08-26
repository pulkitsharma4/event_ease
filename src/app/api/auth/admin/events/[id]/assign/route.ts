// app/api/auth/admin/events/[id]/assign/route.ts
import { NextRequest } from "next/server";
import { handlePatchAssignEvent } from "@/controllers/adminController";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handlePatchAssignEvent(req, params);
}
