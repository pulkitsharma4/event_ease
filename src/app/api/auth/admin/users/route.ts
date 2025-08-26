// app/api/auth/admin/users/route.ts
import { handleGetAdminUsers } from "@/controllers/adminController";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  // @ts-expect-error: NextRequest compat
  return handleGetAdminUsers(req);
}
