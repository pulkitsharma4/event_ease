import { handleGetAssignedEvents } from "@/controllers/auth/eventsController";

export async function GET() {
  return handleGetAssignedEvents();
}
