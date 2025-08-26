"use client";

import * as React from "react";
import { apiRoutes } from "@/config/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BookingDialog from "@/components/events/BookingDialog";

type EventItem = {
  id: string;
  title: string;
  location?: string;
  startsAt: string; // ISO
  remaining: number;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export default function AllEventsPanel() {
  const [items, setItems] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // same source as /events page, but from client (relative URL is fine)
      const url = `${apiRoutes.public.events}?page=1&limit=12&sort=trending`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load events");

      const list: EventItem[] = (data.items ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        location: e.location,
        startsAt: e.startsAt,
        remaining: Number(
          e.remaining ?? Math.max(0, (e.capacity ?? 0) - (e.bookedSlots ?? 0))
        ),
      }));

      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">All events</h2>
        {/* (optional) add filters/search later */}
      </header>

      {loading && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Loading events…
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchEvents}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id} className="w-full">
              <CardHeader>
                <CardTitle className="line-clamp-2">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {e.location && <p>{e.location}</p>}
                <p>{formatDate(e.startsAt)}</p>
                <p>
                  <span className="font-medium text-foreground">{Math.max(0, e.remaining)}</span>{" "}
                  spots left
                </p>
              </CardContent>
              <CardFooter>
                <BookingDialog eventId={e.id} maxQty={e.remaining} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
