import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import * as eventService from "@/services/eventService";

export async function handleGetMyEvents() {
  try {
    const ses = await readSession();
    if (!ses) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const events = await eventService.getMyEvents(ses.sub);
    return NextResponse.json({ success: true, items: events });
  } catch (err: any) {
    console.error("GET /api/auth/events/my failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to load your events" },
      { status: 500 }
    );
  }
}

export async function handleGetAssignedEvents() {
  try {
    const ses = await readSession();
    if (!ses || ses.role !== "staff") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const events = await eventService.getAssignedEventsFor(ses.sub);
    return NextResponse.json({ success: true, items: events });
  } catch (err: any) {
    console.error("GET /api/auth/events/assigned failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to load assigned events" },
      { status: 500 }
    );
  }
}

export async function handleCreateEvent(req: NextRequest) {
  try {
    const ses = await readSession();
    if (!ses || ses.role !== "owner") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const body = await req.json();
    const ev = await eventService.createEvent({ ...body, ownerId: ses.sub });
    return NextResponse.json({ success: true, item: ev });
  } catch (err: any) {
    console.error("POST /api/auth/events failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function handleUpdateEvent(req: NextRequest, id: string) {
  try {
    const ses = await readSession();
    if (!ses) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });

    const body = await req.json();
    const ev = await eventService.updateEvent(id, body);
    if (!ev) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    // optional: enforce owner/admin here if needed
    return NextResponse.json({ success: true, item: ev });
  } catch (err: any) {
    console.error("PATCH /api/auth/events/[id] failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function handleDeleteEvent(id: string) {
  try {
    const ses = await readSession();
    if (!ses) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });

    await eventService.deleteEvent(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/auth/events/[id] failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to delete event" },
      { status: 500 }
    );
  }
}

export async function handleGetEventStats(_req: NextRequest, id: string) {
  try {
    const ses = await readSession();
    if (!ses) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Login required" },
        { status: 403 }
      );
    }

    const stats = await eventService.getEventStats(id);
    if (!stats) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Event not found" },
        { status: 404 }
      );
    }

    // Owners can only see their own event stats
    if (ses.role === "owner" && String(stats.ownerId) !== String(ses.sub)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Not allowed" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, item: stats }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/auth/events/[id]/stats failed:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "INTERNAL", message: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
