"use client";

import * as React from "react";
import { apiRoutes } from "@/config/api";
import MyEventAnalyticsCard from "@/components/dashboard/MyEventAnalyticsCard";
import { Button } from "@/components/ui/button";
import AddEventDialog from "@/components/dashboard/AddEventDialog";

export type MyEvent = {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots: number;
  remaining: number;
  ownerId: string;
};

type Props = {
  currentUserId: string | null;
  currentRole: "owner" | "staff" | "admin";
};

export default function MyEventsPanel({ currentUserId, currentRole }: Props) {
  const [events, setEvents] = React.useState<MyEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const fetchMine = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(apiRoutes.auth.events.my, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success !== true) {
        throw new Error(data?.message || "Failed to load your events");
      }
      const items: MyEvent[] = (data.items ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        slug: e.slug ?? "",
        location: e.location ?? undefined,
        startsAt: e.startsAt,
        capacity: Number(e.capacity ?? 0),
        bookedSlots: Number(e.bookedSlots ?? 0),
        remaining: Number(e.remaining ?? Math.max(0, (e.capacity ?? 0) - (e.bookedSlots ?? 0))),
        ownerId: String(e.ownerId),
      }));
      setEvents(items);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const handleUpdated = (updated: MyEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
  };

  const handleDeleted = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My events</h2>
        {currentRole === "owner" && (
          <AddEventDialog onCreated={() => fetchMine()} />
        )}
      </div>

      {loading && (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading…</div>
      )}
      {err && (
        <div className="rounded-md border p-4 text-sm text-destructive">
          {err}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchMine}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !err && events.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven’t created any events yet.</p>
      )}

      {!loading && !err && events.length > 0 && (
        <div className="space-y-4">
          {events.map((ev) => (
            <MyEventAnalyticsCard
              key={ev.id}
              id={ev.id}
              title={ev.title}
              location={ev.location}
              startsAt={ev.startsAt}
              capacity={ev.capacity}
              bookedSlots={ev.bookedSlots}
              remaining={ev.remaining}   
              slug={ev.slug}
              ownerId={ev.ownerId}
              currentUserId={currentUserId}
              currentRole={currentRole}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}
