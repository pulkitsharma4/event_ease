// app/api/auth/admin/users/[id]/unblock/route.ts
import { NextRequest } from "next/server";
import { handlePatchUnblockUser } from "@/controllers/adminController";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handlePatchUnblockUser(req, params);
}
