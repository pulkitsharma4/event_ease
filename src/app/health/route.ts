// src/app/api/health/route.ts
import { handleHealth } from "../../controllers/healthController";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleHealth();
}
