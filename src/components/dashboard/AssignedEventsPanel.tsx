"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BookingDialog from "@/components/events/BookingDialog";

type EventItem = {
  id: string;
  title: string;
  location?: string;
  startsAt: string;   // ISO
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

export default function AssignedEventsPanel() {
  const [items, setItems] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAssigned = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/events/assigned", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || data?.success !== true) {
        throw new Error(data?.message || "Failed to load assigned events");
      }
      const list: EventItem[] = (data.items ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        location: e.location ?? undefined,
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
    fetchAssigned();
  }, [fetchAssigned]);

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">Assigned events</h2>
        {/* (optional) filters/search later */}
      </header>

      {loading && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchAssigned}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing assigned to you yet.</p>
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
              <CardFooter className="flex gap-2">
                {/* Read-only tools for staff; booking optional */}
                <BookingDialog eventId={e.id} maxQty={e.remaining} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
