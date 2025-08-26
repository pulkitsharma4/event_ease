// src/services/eventService.ts
import  connectDB  from "@/lib/db";
import  EventModel  from "@/models/Event";
import { RSVPModel } from "@/models/RSVP";
import mongoose from "mongoose";

/* =========================================
   Types
========================================= */

type OID = mongoose.Types.ObjectId;

/** Shape of Event after .lean() */
type EventLean = {
  _id: OID;
  title: string;
  slug?: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots?: number;
  ownerId: OID;
  assigned_to?: OID | null; // <-- NEW
  createdAt?: Date;
  updatedAt?: Date;
};

export type EventDTO = {
  id: string;
  title: string;
  slug: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots: number;
  remaining: number;
  ownerId: string;
  assigned_to: string | null; // <-- expose to UI layer if needed
};

/** Stats DTO for charts */
export type EventStats = {
  eventId: string;
  ownerId: string;
  capacity: number;
  booked: number;
  remaining: number;
  byDay: { date: string; count: number }[];
};

/* =========================================
   Helpers
========================================= */

function toOID(id?: string | null): OID | null {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function mapEvent(e: EventLean): EventDTO {
  const capacity = Number(e.capacity ?? 0);
  const booked = Number(e.bookedSlots ?? 0);
  return {
    id: String(e._id),
    title: e.title,
    slug: e.slug ?? "",
    location: e.location ?? undefined,
    startsAt: e.startsAt,
    capacity,
    bookedSlots: booked,
    remaining: Math.max(0, capacity - booked),
    ownerId: String(e.ownerId),
    assigned_to: e.assigned_to ? String(e.assigned_to) : null,
  };
}

/* =========================================
   Public listings
========================================= */

export async function listPublicEvents({
  page = 1,
  limit = 12,
  q,
  sort = "trending",
}: {
  page?: number;
  limit?: number;
  q?: string;
  sort?: "trending" | "soonest" | "fewest-left";
}): Promise<EventDTO[]> {
  await connectDB();

  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
    ];
  }

  let sortQuery: Record<string, 1 | -1> = {};
  if (sort === "trending" || sort === "soonest") sortQuery = { startsAt: 1 };
  else if (sort === "fewest-left") sortQuery = { capacity: 1 };

  const docs = await EventModel.find(filter)
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .lean<EventLean[]>()
    .exec();

  return docs.map(mapEvent);
}

export async function getTrendingEvents(limit = 6): Promise<EventDTO[]> {
  return listPublicEvents({ page: 1, limit, sort: "trending" });
}

/* =========================================
   Auth listings
========================================= */

export async function getMyEvents(ownerId: string): Promise<EventDTO[]> {
  await connectDB();
  const ownerOID = toOID(ownerId);
  const docs = await EventModel.find({ ownerId: ownerOID })
    .sort({ startsAt: 1 })
    .lean<EventLean[]>()
    .exec();

  return docs.map(mapEvent);
}

/**
 * Events assigned to a specific staff user (read-only).
 * If you need "all assigned events" regardless of staff, use getAllAssignedEvents().
 */
export async function getAssignedEventsFor(staffUserId: string): Promise<EventDTO[]> {
  await connectDB();
  const staffOID = toOID(staffUserId);
  const docs = await EventModel.find({ assigned_to: staffOID })
    .sort({ startsAt: 1 })
    .lean<EventLean[]>()
    .exec();

  return docs.map(mapEvent);
}

/** All events that have any assignee (admin / staff ops tooling) */
export async function getAllAssignedEvents(): Promise<EventDTO[]> {
  await connectDB();
  const docs = await EventModel.find({ assigned_to: { $ne: null } })
    .sort({ startsAt: 1 })
    .lean<EventLean[]>()
    .exec();

  return docs.map(mapEvent);
}

/* =========================================
   CRUD
========================================= */

export async function createEvent(data: {
  ownerId: string;
  title: string;
  startsAt: string;
  capacity: number;
  location?: string;
  slug?: string;
  assigned_to?: string | null; // optional
}): Promise<EventDTO> {
  await connectDB();

  const docToCreate: any = {
    title: data.title,
    slug: data.slug ?? undefined,
    location: data.location ?? undefined,
    startsAt: data.startsAt,
    capacity: data.capacity,
    bookedSlots: 0,
    ownerId: toOID(data.ownerId),
    assigned_to: data.assigned_to ? toOID(data.assigned_to) : null,
  };

  const created = await new EventModel(docToCreate).save();
  const fresh = await EventModel.findById(created._id).lean<EventLean>().exec();
  if (!fresh) throw new Error("Failed to create event");
  return mapEvent(fresh);
}

export async function updateEvent(
  id: string,
  updates: Partial<{
    title: string;
    location?: string;
    startsAt: string;
    capacity: number;
    slug?: string;
    assigned_to: string | null; // optional update
  }>
): Promise<EventDTO | null> {
  await connectDB();

  const norm: any = { ...updates };
  if ("assigned_to" in norm) {
    norm.assigned_to = updates.assigned_to ? toOID(updates.assigned_to) : null;
  }

  const updated = await EventModel.findByIdAndUpdate(id, norm, { new: true })
    .lean<EventLean | null>()
    .exec();

  return updated ? mapEvent(updated) : null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  await connectDB();
  await EventModel.findByIdAndDelete(id).exec();
  return true;
}

/* =========================================
   Stats (for dashboard charts)
========================================= */

export async function getEventStats(eventId: string): Promise<EventStats | null> {
  await connectDB();

  if (!mongoose.isValidObjectId(eventId)) return null;

  const ev = await EventModel.findById(eventId).lean<EventLean | null>().exec();
  if (!ev) return null;

  const evOID = new mongoose.Types.ObjectId(String(ev._id));

  const daily = await RSVPModel.aggregate([
    { $match: { eventId: evOID } },
    {
      $group: {
        _id: {
          $dateToString: {
            date: "$createdAt",
            format: "%Y-%m-%d",
            timezone: "UTC",
          },
        },
        count: { $sum: { $ifNull: ["$qty", 1] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDay = (daily ?? []).map((d: any) => ({
    date: d._id as string,
    count: Number(d.count) || 0,
  }));

  const capacity = Number(ev.capacity ?? 0);
  const bookedFromDaily = byDay.reduce((a, d) => a + d.count, 0);
  const booked = bookedFromDaily || Number(ev.bookedSlots ?? 0);
  const remaining = Math.max(0, capacity - booked);

  return {
    eventId: String(ev._id),
    ownerId: String(ev.ownerId),
    capacity,
    booked,
    remaining,
    byDay,
  };
}
