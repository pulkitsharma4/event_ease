// src/controllers/adminController.ts
import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import * as adminService from "@/services/adminService";

async function requireAdmin() {
    const ses = await readSession();
    if (!ses || ses.role !== "admin") {
        return { ok: false as const, res: NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 }) };
    }
    return { ok: true as const, ses };
}

/* ===== STATS ===== */
export async function handleGetAdminStats() {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const data = await adminService.getUserCounts();
        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error("GET /api/auth/admin/stats failed:", err?.message || err);
        return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
    }
}

/* ===== USERS: LIST (supports q & role) ===== */
export async function handleGetAdminUsers(req: NextRequest) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") ?? undefined;
        const roleParam = searchParams.get("role") ?? undefined;
        const role = (["owner", "staff", "admin"].includes(String(roleParam))
            ? (roleParam as "owner" | "staff" | "admin")
            : undefined) as "owner" | "staff" | "admin" | undefined;

        const items = await adminService.listUsersWithEventCounts({ q, role });
        return NextResponse.json({ success: true, items });
    } catch (err: any) {
        console.error("GET /api/auth/admin/users failed:", err?.message || err);
        return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
    }
}

/* ===== USERS: BLOCK ===== */
export async function handlePatchBlockUser(_req: NextRequest, params: { id: string }) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const { id } = params;
        const updated = await adminService.blockUser(id, true);
        return NextResponse.json({ success: true, updated });
    } catch (err: any) {
        const msg = err?.message || err;
        const code = msg === "NOT_FOUND" || msg === "INVALID_USER_ID" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}

/* ===== USERS: UNBLOCK ===== */
export async function handlePatchUnblockUser(_req: NextRequest, params: { id: string }) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const { id } = params;
        const updated = await adminService.blockUser(id, false);
        return NextResponse.json({ success: true, updated });
    } catch (err: any) {
        const msg = err?.message || err;
        const code = msg === "NOT_FOUND" || msg === "INVALID_USER_ID" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}

/* ===== USERS: ASSIGN ROLE ===== */
export async function handlePatchAssignRole(req: NextRequest, params: { id: string }) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const { id } = params;
        const body = await req.json().catch(() => ({}));
        const role = body?.role as adminService.Role;
        const updated = await adminService.assignRole(id, role);
        return NextResponse.json({ success: true, updated });
    } catch (err: any) {
        const msg = err?.message || err;
        const code = msg === "INVALID_ROLE" || msg === "NOT_FOUND" || msg === "INVALID_USER_ID" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}

/* ===== EVENTS: LIST ALL ===== */
export async function handleGetAdminEvents() {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const items = await adminService.listAllEvents();
        return NextResponse.json({ success: true, items });
    } catch (err: any) {
        console.error("GET /api/auth/admin/events failed:", err?.message || err);
        return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
    }
}

/* ===== EVENTS: CREATE ===== */
export async function handlePostAdminEvent(req: NextRequest) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const { title, location, startsAt, capacity, description } = body ?? {};
        const created = await adminService.createEventForAdmin({
            ownerId: gate.ses!.sub, // admin creating the event; change if you'd like to choose owner
            title,
            location,
            startsAt,
            capacity,
            description,
        });
        return NextResponse.json({ success: true, created }, { status: 201 });
    } catch (err: any) {
        const msg = err?.message || String(err);
        if (/E11000/i.test(msg) && /slug_1|index:\s*slug/.test(msg)) {
            return NextResponse.json({ success: false, error: "DUPLICATE_SLUG" }, { status: 409 });
        }
        const code =
            msg === "TITLE_REQUIRED" || msg === "INVALID_DATE" || msg === "INVALID_OWNER_ID" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}

/* ===== EVENTS: ASSIGN TO STAFF ===== */
export async function handlePatchAssignEvent(req: NextRequest, params: { id: string }) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const { id } = params;
        const body = await req.json().catch(() => ({}));
        const staffId = String(body?.staffId || "");
        const updated = await adminService.assignEventToStaff(id, staffId);
        return NextResponse.json({ success: true, updated });
    } catch (err: any) {
        const msg = err?.message || err;
        const code =
            msg === "INVALID_EVENT_ID" ||
                msg === "INVALID_USER_ID" ||
                msg === "STAFF_NOT_FOUND" ||
                msg === "EVENT_NOT_FOUND"
                ? 400
                : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}

/* ===== EVENTS: DELETE ===== */
export async function handleDeleteEvent(_req: NextRequest, params: { id: string }) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.res;

    try {
        await dbConnect();
        const { id } = params;
        const deleted = await adminService.deleteEventById(id);
        return NextResponse.json({ success: true, deleted });
    } catch (err: any) {
        const msg = err?.message || err;
        const code = msg === "INVALID_EVENT_ID" || msg === "EVENT_NOT_FOUND" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status: code });
    }
}
