// app/api/auth/admin/users/[id]/block/route.ts
import { NextRequest } from "next/server";
import { handlePatchBlockUser } from "@/controllers/adminController";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return handlePatchBlockUser(req, params);
}
