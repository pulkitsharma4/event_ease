import { headers } from "next/headers";
import { apiRoutes } from "@/config/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

async function fetchEvents(page = 1, limit = 12, sort = "trending"): Promise<EventItem[]> {
  const h = await headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const base = `${protocol}://${host}`;

  const url = `${base}${apiRoutes.public.events}?page=${page}&limit=${limit}&sort=${sort}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: any[] };
  return (data.items ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    location: e.location,
    startsAt: e.startsAt,
    remaining: Number(e.remaining ?? Math.max(0, (e.capacity ?? 0) - (e.bookedSlots ?? 0))),
  }));
}

export default async function EventsPage() {
  const items = await fetchEvents(1, 12, "trending");

  return (
    <section className="space-y-6 p-5">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">All events</h1>
        {/* TODO: filters/search later */}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
      ) : (
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
