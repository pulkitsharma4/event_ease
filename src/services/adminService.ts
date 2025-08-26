// src/services/adminService.ts
import mongoose, { Types } from "mongoose";
import User from "@/models/User";
import Event from "@/models/Event";
import type { UserRole } from "@/models/User";

/* ===================== Types ===================== */

export type Role = UserRole;

export type AdminCounts = {
  totalUsers: number;
  totalOwners: number;
  totalStaff: number;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked?: boolean;
  eventCount: number;
};

export type AdminEventItem = {
  id: string;
  title: string;
  location?: string;
  startsAt?: Date;
  capacity?: number;
  bookedSlots?: number;
  assigned_to: string | null; // staff userId or null
  assignedName?: string | null;
  assignedEmail?: string | null;
};

/* For typed .lean() with populated assigned_to  */
type PopulatedUserMin = { _id: Types.ObjectId; name?: string; email?: string };
type LeanEventWithAssigned = {
  _id: Types.ObjectId;
  title: string;
  location?: string;
  startsAt: Date;
  capacity: number;
  bookedSlots: number;
  assigned_to?: Types.ObjectId | PopulatedUserMin | null;
};

/* ================== Counts ================== */

export async function getUserCounts(): Promise<AdminCounts> {
  const [totalUsers, totalOwners, totalStaff] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "owner" }),
    User.countDocuments({ role: "staff" }),
  ]);
  return { totalUsers, totalOwners, totalStaff };
}

/* =========== Users (list/search + actions) =========== */

export async function listUsersWithEventCounts(filters?: {
  q?: string;
  role?: Role;
}): Promise<AdminUserListItem[]> {
  const match: Record<string, any> = {};
  if (filters?.role) match.role = filters.role;

  if (filters?.q && filters.q.trim()) {
    const rx = new RegExp(filters.q.trim(), "i");
    match.$or = [{ email: rx }, { name: rx }];
  }

  // Get users (lean + typed)
  const users = await User.find(match)
    .select({ _id: 1, name: 1, email: 1, role: 1, isBlocked: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean<{ _id: Types.ObjectId; name?: string; email?: string; role: Role; isBlocked?: boolean; createdAt?: Date }[]>();

  if (users.length === 0) return [];

  // Count events per ownerId (filter to returned users for efficiency)
  const ownerIds = users.map((u) => u._id);
  const counts = await Event.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { ownerId: { $in: ownerIds } } },
    { $group: { _id: "$ownerId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>(
    counts.map((c) => [c._id.toString(), c.count])
  );

  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role,
    isBlocked: !!u.isBlocked,
    eventCount: countMap.get(u._id.toString()) ?? 0,
  }));
}

export async function blockUser(userId: string, block: boolean) {
  if (!mongoose.isValidObjectId(userId)) throw new Error("INVALID_USER_ID");
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { isBlocked: !!block } },
    { new: true, projection: { _id: 1, isBlocked: 1 } }
  ).lean<{ _id: Types.ObjectId; isBlocked?: boolean } | null>();
  if (!updated) throw new Error("NOT_FOUND");
  return { id: updated._id.toString(), isBlocked: !!updated.isBlocked };
}

export async function assignRole(userId: string, role: Role) {
  if (!mongoose.isValidObjectId(userId)) throw new Error("INVALID_USER_ID");
  if (!["owner", "staff", "admin"].includes(role)) throw new Error("INVALID_ROLE");
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true, projection: { _id: 1, role: 1 } }
  ).lean<{ _id: Types.ObjectId; role: Role } | null>();
  if (!updated) throw new Error("NOT_FOUND");
  return { id: updated._id.toString(), role: updated.role };
}

/* =========== Events (list + assign + delete + create) =========== */

// --- replace this whole function ---
export async function listAllEvents(): Promise<AdminEventItem[]> {
  const docs = await Event.find({})
    .sort({ startsAt: 1 })
    .limit(300)
    .select({ _id: 1, title: 1, location: 1, startsAt: 1, capacity: 1, bookedSlots: 1, assigned_to: 1 })
    .lean<{ _id: Types.ObjectId; title: string; location?: string; startsAt: Date; capacity: number; bookedSlots: number; assigned_to?: Types.ObjectId | string | null }[]>();

  // Collect valid ObjectIds only (ignore bad historical values gracefully)
  const assignedIds = Array.from(
    new Set(
      docs
        .map((d) => d.assigned_to)
        .filter((v): v is Types.ObjectId | string => v != null)
    )
  ).filter((id) => mongoose.isValidObjectId(id)) as (Types.ObjectId | string)[];

  const userMap = new Map<string, { name?: string; email?: string }>();
  if (assignedIds.length) {
    const users = await User.find({ _id: { $in: assignedIds } })
      .select({ _id: 1, name: 1, email: 1 })
      .lean<{ _id: Types.ObjectId; name?: string; email?: string }[]>();
    users.forEach((u) => userMap.set(u._id.toString(), { name: u.name, email: u.email }));
  }

  return docs.map((d) => {
    const key = d.assigned_to
      ? typeof d.assigned_to === "string"
        ? d.assigned_to
        : d.assigned_to.toString()
      : null;
    const info = key ? userMap.get(key) : undefined;

    return {
      id: d._id.toString(),
      title: d.title,
      location: d.location,
      startsAt: d.startsAt,
      capacity: d.capacity,
      bookedSlots: d.bookedSlots,
      assigned_to: key,
      assignedName: info?.name ?? null,
      assignedEmail: info?.email ?? null,
    };
  });
}


export async function assignEventToStaff(eventId: string, staffUserId: string) {
  if (!mongoose.isValidObjectId(eventId)) throw new Error("INVALID_EVENT_ID");
  if (!mongoose.isValidObjectId(staffUserId)) throw new Error("INVALID_USER_ID");

  const staff = await User.findOne({ _id: staffUserId, role: "staff" }).lean();
  if (!staff) throw new Error("STAFF_NOT_FOUND");

  // Reliable write
  const res = await Event.updateOne(
    { _id: eventId },
    { $set: { assigned_to: new mongoose.Types.ObjectId(staffUserId) } }
  );
  if (res.matchedCount !== 1) throw new Error("EVENT_NOT_FOUND");

  const updated = await Event.findById(eventId)
    .select({ _id: 1, assigned_to: 1 })
    .lean<{ _id: Types.ObjectId; assigned_to?: Types.ObjectId | null } | null>();

  if (!updated) throw new Error("EVENT_NOT_FOUND");

  return {
    id: updated._id.toString(),
    assigned_to: updated.assigned_to ? updated.assigned_to.toString() : null,
  };
}

export async function deleteEventById(eventId: string) {
  if (!mongoose.isValidObjectId(eventId)) throw new Error("INVALID_EVENT_ID");
  const res = await Event.findByIdAndDelete(eventId)
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId } | null>();
  if (!res) throw new Error("EVENT_NOT_FOUND");
  return { id: eventId, deleted: true as const };
}

export async function createEventForAdmin(input: {
  ownerId: string; // creator/owner (admin's ID or chosen owner)
  title: string;
  location?: string;
  startsAt: string | Date;
  capacity: number;
  description?: string;
}): Promise<AdminEventItem> {
  if (!mongoose.isValidObjectId(input.ownerId)) throw new Error("INVALID_OWNER_ID");

  const title = String(input.title || "").trim();
  if (!title) throw new Error("TITLE_REQUIRED");

  const capacity = Math.max(0, Number(input.capacity ?? 0));
  const d = new Date(input.startsAt);
  if (isNaN(d.getTime())) throw new Error("INVALID_DATE");

  const slugBase = slugify(title);
  let slug = `${slugBase}-${Date.now().toString(36)}`;

  try {
    const doc = await Event.create({
      ownerId: new mongoose.Types.ObjectId(input.ownerId),
      title,
      location: input.location?.trim() || undefined,
      startsAt: d,
      capacity,
      description: input.description?.trim() || undefined,
      bookedSlots: 0,
      views: 0,
      assigned_to: null,
      slug,
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      location: doc.location,
      startsAt: doc.startsAt,
      capacity: doc.capacity,
      bookedSlots: doc.bookedSlots,
      assigned_to: null,
      assignedName: null,
      assignedEmail: null,
    };
  } catch (err: any) {
    // duplicate slug? retry once with random suffix
    const msg: string = err?.message ?? "";
    const isDup = /E11000/i.test(msg) && /slug_1|index:\s*slug/.test(msg);
    if (!isDup) throw err;

    slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
    const doc = await Event.create({
      ownerId: new mongoose.Types.ObjectId(input.ownerId),
      title,
      location: input.location?.trim() || undefined,
      startsAt: d,
      capacity,
      description: input.description?.trim() || undefined,
      bookedSlots: 0,
      views: 0,
      assigned_to: null,
      slug,
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      location: doc.location,
      startsAt: doc.startsAt,
      capacity: doc.capacity,
      bookedSlots: doc.bookedSlots,
      assigned_to: null,
      assignedName: null,
      assignedEmail: null,
    };
  }
}

/* ===================== Helpers ===================== */

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
