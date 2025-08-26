// app/api/auth/admin/stats/route.ts
import { handleGetAdminStats } from "@/controllers/adminController";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleGetAdminStats();
}
