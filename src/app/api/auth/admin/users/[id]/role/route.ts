// app/api/auth/admin/users/[id]/role/route.ts
import { NextRequest } from "next/server";
import { handlePatchAssignRole } from "@/controllers/adminController";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handlePatchAssignRole(req, params);
}
