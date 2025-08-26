// app/admin/events/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

type AdminEventItem = {
  id: string;
  title: string;
  location?: string;
  startsAt?: string;
  capacity?: number;
  bookedSlots?: number;
  assigned_to: string | null;
  assignedName?: string | null;
  assignedEmail?: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "staff";
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminEventItem | null>(null);

  // create dialog
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    location: "",
    startsAt: "",
    capacity: 0,
    description: "",
  });
  const canSubmit =
    form.title.trim().length > 0 &&
    form.startsAt.trim().length > 0 &&
    Number.isFinite(Number(form.capacity));

  // staff search
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch("/api/auth/admin/events", { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) throw new Error(`Failed: ${r.status} ${await r.text().catch(() => "")}`);
        return r.json();
      })
      .then((json) => {
        if (!alive) return;
        setItems(Array.isArray(json?.items) ? json.items : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load events");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const openAssign = (ev: AdminEventItem) => {
    setSelectedEvent(ev);
    setAssignOpen(true);
    loadStaff("");
  };

  const loadStaff = (query: string) => {
    setQ(query);
    setStaffLoading(true);
    setStaffError(null);

    const url = `/api/auth/admin/users?role=staff${query ? `&q=${encodeURIComponent(query)}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed: ${r.status} ${await r.text().catch(() => "")}`);
        return r.json();
      })
      .then((json) => {
        const arr = Array.isArray(json?.items) ? json.items : [];
        setStaff(
          arr.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: "staff" as const,
          }))
        );
      })
      .catch((e) => setStaffError(e?.message || "Failed to load staff"))
      .finally(() => setStaffLoading(false));
  };

  const assignTo = async (staffId: string) => {
    if (!selectedEvent) return;
    const evId = selectedEvent.id;

    const prev = items;
    const picked = staff.find((s) => s.id === staffId);
    setItems((list) =>
      list.map((it) =>
        it.id === evId
          ? {
              ...it,
              assigned_to: staffId,
              assignedName: picked?.name ?? null,
              assignedEmail: picked?.email ?? null,
            }
          : it
      )
    );

    const res = await fetch(`/api/auth/admin/events/${evId}/assign`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffId }),
    });

    if (!res.ok) {
      setItems(prev);
    } else {
      setAssignOpen(false);
      setSelectedEvent(null);
    }
  };

  const delEvent = async (ev: AdminEventItem) => {
    if (!confirm(`Delete event "${ev.title}"?`)) return;

    const prev = items;
    setItems((list) => list.filter((x) => x.id !== ev.id));

    const res = await fetch(`/api/auth/admin/events/${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev);
    }
  };

  const editEvent = (ev: AdminEventItem) => {
    router.push(`/dashboard?edit=${ev.id}`);
  };

  const createEvent = async () => {
    if (!canSubmit || creating) return;
    setCreating(true);
    const payload = {
      title: form.title.trim(),
      location: form.location.trim() || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      capacity: Number(form.capacity),
      description: form.description.trim() || undefined,
    };

    const res = await fetch("/api/auth/admin/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Optional: alert(await res.text());
      setCreating(false);
      return;
    }

    const json = await res.json();
    const created: AdminEventItem | undefined = json?.created;
    if (created) {
      setItems((list) => [created, ...list]);
    }
    setCreating(false);
    setAddOpen(false);
    setForm({ title: "", location: "", startsAt: "", capacity: 0, description: "" });
  };

  return (
    <main className="space-y-5">
      {/* Header with Add Event */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            <h1 className="text-xl font-semibold">Events</h1>
          </div>
          <p className="text-sm text-gray-500">Manage all events · edit, delete, assign staff, and create new</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          + Add Event
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Events grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !items.length ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border shadow-sm">
              <div className="h-1 w-full rounded-t-2xl bg-red-100" />
              <div className="p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-red-50" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-red-50" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-3 w-28 animate-pulse rounded bg-red-50" />
                  <div className="h-8 w-40 animate-pulse rounded bg-red-50" />
                </div>
              </div>
            </div>
          ))
        ) : items.length ? (
          items.map((ev) => (
            <EventCard key={ev.id} ev={ev} onEdit={editEvent} onDelete={delEvent} onAssign={(e) => { setSelectedEvent(e); setAssignOpen(true); }} />
          ))
        ) : (
          <div className="col-span-full rounded-xl border p-6 text-center text-sm text-gray-500">No events found.</div>
        )}
      </section>

      {/* Assign dialog */}
      {assignOpen && selectedEvent && (
        <AssignDialog
          eventTitle={selectedEvent.title}
          q={q}
          staff={staff}
          staffLoading={staffLoading}
          staffError={staffError}
          onClose={() => { setAssignOpen(false); setSelectedEvent(null); }}
          onSearch={loadStaff}
          onAssign={(id) => assignTo(id)}
        />
      )}

      {/* Create dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Create event</h3>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Title</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
                    placeholder="Event title"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Location</span>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
                    placeholder="City / Venue"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Starts at</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Capacity</span>
                  <input
                    type="number"
                    min={0}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
                  />
                </label>
              </div>

              <label className="text-sm block">
                <span className="mb-1 block text-gray-600">Description (optional)</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
                  rows={3}
                  placeholder="Details..."
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!canSubmit || creating}
                onClick={createEvent}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ----------------- Subcomponents ----------------- */

function AssignDialog({
  eventTitle,
  q,
  staff,
  staffLoading,
  staffError,
  onClose,
  onSearch,
  onAssign,
}: {
  eventTitle: string;
  q: string;
  staff: StaffRow[];
  staffLoading: boolean;
  staffError: string | null;
  onClose: () => void;
  onSearch: (query: string) => void;
  onAssign: (staffId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            Assign staff — <span className="text-red-600">{eventTitle}</span>
          </h3>
          <button onClick={onClose} className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50">
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search staff by name or email…"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {staffLoading ? "Searching…" : "Search"}
            </span>
          </div>

          {staffError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{staffError}</div>
          )}

          <div className="max-h-80 overflow-auto rounded-xl border">
            {staffLoading && !staff.length ? (
              <div className="p-4 text-sm text-gray-500">Loading staff…</div>
            ) : staff.length ? (
              <ul className="divide-y">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name || "—"}</p>
                      <p className="text-xs text-gray-500">{s.email || "—"}</p>
                    </div>
                    <button
                      onClick={() => onAssign(s.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                    >
                      Assign
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-gray-500">No staff found.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({
  ev,
  onEdit,
  onDelete,
  onAssign,
}: {
  ev: AdminEventItem;
  onEdit: (e: AdminEventItem) => void;
  onDelete: (e: AdminEventItem) => void;
  onAssign: (e: AdminEventItem) => void;
}) {
  const capacity = Number(ev.capacity ?? 0);
  const booked = Math.max(0, Number(ev.bookedSlots ?? 0));
  const remaining = Math.max(0, capacity - booked);

  const pieData = [
    { name: "Booked", value: booked },
    { name: "Remaining", value: remaining },
  ];

  const barData = [{ name: "Utilization", Booked: booked, Remaining: remaining }];

  return (
    <article className="rounded-xl border shadow-sm">
      <div className="h-1 w-full rounded-t-2xl bg-red-500" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{ev.title || "—"}</h3>
            <p className="text-xs text-gray-500">
              {ev.location || "—"} {ev.startsAt ? `· ${formatDate(ev.startsAt)}` : ""}
            </p>
          </div>
          {ev.assigned_to ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
              {ev.assignedName || "Assigned"}
            </span>
          ) : (
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-gray-600">Unassigned</span>
          )}
        </div>

        <div className="text-xs text-gray-600">
          Capacity: <strong className="text-red-600">{capacity ?? "—"}</strong> · Booked:{" "}
          <strong className="text-red-600">{booked ?? 0}</strong>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-xs font-medium">Booked vs Remaining</p>
              <span className="text-[11px] text-gray-500">Cap: <strong className="text-red-600">{capacity || "—"}</strong></span>
            </div>
            <div className="h-32 p-2">
              {capacity > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2} isAnimationActive={false}>
                      <Cell fill="#ef4444" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-gray-500">No capacity data</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t px-3 py-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
                Booked: <strong className="text-red-600">{booked}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#e5e7eb" }} />
                Remaining: <strong>{remaining}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-xs font-medium">Utilization</p>
              <span className="text-[11px] text-gray-500">
                {capacity > 0 ? `${Math.round((booked / capacity) * 100)}%` : "—"}
              </span>
            </div>
            <div className="h-32 p-2">
              {capacity > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <XAxis dataKey="name" hide />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(val: number, key: string) => [val, key]} />
                    <Bar dataKey="Remaining" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Booked" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-gray-500">No capacity data</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onEdit(ev)} className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50">Edit</button>
          <button onClick={() => onDelete(ev)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50">Delete</button>
          <button onClick={() => onAssign(ev)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50">Assigned to</button>
        </div>
      </div>
    </article>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
