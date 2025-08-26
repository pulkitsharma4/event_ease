import { handleGetMyEvents } from "@/controllers/auth/eventsController";

export async function GET() {
  return handleGetMyEvents();
}
