"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EditEventDialog from "@/components/events/EditEventDialog";
import DeleteEventButton from "@/components/events/DeleteEventButton";
import { apiRoutes } from "@/config/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type UpdatedEvent = {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots: number;
  ownerId: string;
  remaining: number; // keep aligned with MyEvent
};

export type MyEventAnalyticsCardProps = {
  id: string;
  title: string;
  location?: string;
  startsAt: string; // ISO
  capacity: number;
  bookedSlots: number;
  remaining: number;     // <-- NEW: use server remaining as fallback truth
  slug?: string;
  ownerId: string;

  currentUserId: string | null;
  currentRole: "owner" | "staff" | "admin";

  onUpdated?: (ev: UpdatedEvent) => void;
  onDeleted?: (id: string) => void;
};

const PIE_COLORS = {
  booked: "#ef4444",   // red-500
  unbooked: "#9ca3af", // gray-400
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function makeFallbackSeries(total: number, days = 7) {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  const base = Math.floor(total / days);
  let rem = total % days;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: base + (rem-- > 0 ? 1 : 0) });
  }
  return out;
}

export default function MyEventAnalyticsCard(props: MyEventAnalyticsCardProps) {
  const {
    id,
    title,
    location,
    startsAt,
    capacity,
    bookedSlots,
    remaining,
    slug,
    ownerId,
    currentUserId,
    currentRole,
    onUpdated,
    onDeleted,
  } = props;

  // derive booked from server 'remaining' for an accurate fallback
  const initialBooked = Math.max(0, capacity - remaining);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
  capacity,
  booked: initialBooked,          // <- stays from props
  remaining,                      // <- stays from props
  byDay: [] as { date: string; count: number }[],
});

  const canEdit =
    currentRole === "admin" ||
    (currentUserId && String(ownerId) === String(currentUserId));

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const url = apiRoutes.auth.events.stats(id);
        const res = await fetch(url, { credentials: "include", cache: "no-store" });

        const text = await res.text();
        const data: any = (() => {
          try {
            return JSON.parse(text);
          } catch {
            return {};
          }
        })();

        if (!res.ok || data?.success !== true) {
          const serverMsg = data?.message || data?.error || `HTTP ${res.status}`;
          console.warn("Stats fetch failed:", serverMsg);
          if (mounted) {
            setErr(String(serverMsg));
            setLoading(false);
          }
          return;
        }

        const s = data.item as {
          capacity: number;
          booked: number;
          remaining: number;
          byDay: { date: string; count: number }[];
        };
        if (mounted) {
          setStats(prev => ({
            ...prev,
            byDay: Array.isArray(s?.byDay) ? s.byDay : [],
          }));
        }
      } catch (e: any) {
        console.warn("Stats fetch error:", e?.message || e);
        if (mounted) setErr(e?.message || "Could not load stats");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const pieData = [
    { name: "Booked", value: stats.booked, color: PIE_COLORS.booked },
    { name: "Unbooked", value: stats.remaining, color: PIE_COLORS.unbooked },
  ];

  const lineSeries =
    stats.byDay && stats.byDay.length > 0 ? stats.byDay : makeFallbackSeries(stats.booked);

  return (
    <Card className="w-full p-4 overflow-hidden">
      <div className="grid gap-6 md:grid-cols-3 items-center">
        {/* LEFT: details + actions */}
        <section className="space-y-2 min-w-0">
          <h3 className="text-lg font-semibold line-clamp-2 break-words">{title}</h3>
          {location && (
            <p className="text-sm text-muted-foreground truncate">{location}</p>
          )}
          <p className="text-sm text-muted-foreground">{formatDate(startsAt)}</p>
          <p className="text-sm">
            <span className="font-medium">{stats.remaining}</span> / {stats.capacity} spots left
          </p>

          {canEdit && (
            <div className="pt-2 flex flex-wrap gap-2">
              <EditEventDialog
                event={{ id, title, slug, location, startsAt, capacity, bookedSlots }}
                onUpdated={(updated) =>
                  onUpdated?.({
                    ...updated,
                    ownerId,
                    remaining: Math.max(0, updated.capacity - updated.bookedSlots),
                  })
                }
                trigger={<Button variant="outline" size="sm">Edit</Button>}
              />
              <DeleteEventButton
                eventId={id}
                onDeleted={() => onDeleted?.(id)}
                label="Delete"
              />
            </div>
          )}

          {loading && <p className="text-xs text-muted-foreground">Loading stats…</p>}
          {!loading && err && (
            <p className="text-[11px] text-muted-foreground">
              Showing basic numbers. Stats API: {err}
            </p>
          )}
        </section>

        {/* MIDDLE: Pie (Booked vs Unbooked) */}
        <section className="h-44 md:h-40 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={65}
                strokeWidth={1}
              >
                {pieData.map((slice, idx) => (
                  <Cell key={idx} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 text-xs text-muted-foreground text-center whitespace-nowrap overflow-hidden text-ellipsis">
            <span style={{ color: PIE_COLORS.booked }}>●</span> Booked &nbsp;&nbsp;
            <span style={{ color: PIE_COLORS.unbooked }}>●</span> Unbooked
          </div>
        </section>

        {/* RIGHT: Line (booked per day) */}
        <section className="h-44 md:h-40 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 text-xs text-muted-foreground text-center truncate">
            Bookings per day
          </div>
        </section>
      </div>
    </Card>
  );
}
