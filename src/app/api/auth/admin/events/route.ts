// app/api/auth/admin/events/route.ts
import { handleGetAdminEvents, handlePostAdminEvent } from "@/controllers/adminController";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleGetAdminEvents();
}

export async function POST(req: Request) {
  // @ts-expect-error NextRequest compat
  return handlePostAdminEvent(req);
}
