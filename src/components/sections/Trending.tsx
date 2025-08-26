// src/components/sections/Trending.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { apiRoutes } from "@/config/api";

type EventItem = {
  id: string;
  title: string;
  location?: string;
  startsAt: string; // ISO
  remaining?: number;
  capacity?: number;
  bookedSlots?: number;
};

async function buildAbsoluteUrl(pathOrUrl: string, limit: number) {
  // If apiRoutes already has an absolute URL, just add limit and return.
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const url = new URL(pathOrUrl);
    url.searchParams.set("limit", String(limit));
    return url.toString();
  }

  // Otherwise derive base from request headers (Next 15: headers() is async)
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";

  const isLocal =
    host.includes("localhost") ||
    host.startsWith("127.") ||
    host.startsWith("[::1]");

  const xfProto = h.get("x-forwarded-proto");
  const protocol = xfProto ?? (isLocal ? "http" : "https");

  const url = new URL(`${protocol}://${host}${pathOrUrl}`);
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

async function fetchTrending(limit: number): Promise<EventItem[]> {
  try {
    const endpoint = await buildAbsoluteUrl(apiRoutes.public.home, limit);

    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return [];

    const json: any = await res.json();

    // Accept multiple shapes from the public controller
    let base: any[] = [];
    if (Array.isArray(json?.items)) base = json.items;
    else if (Array.isArray(json?.trending)) base = json.trending;
    else if (Array.isArray(json?.data?.items)) base = json.data.items;
    else if (Array.isArray(json?.data)) base = json.data;

    if (!Array.isArray(base) || base.length === 0) return [];

    return base.map((e: any) => {
      const capacity = typeof e.capacity === "number" ? e.capacity : undefined;
      const booked =
        typeof e.bookedSlots === "number" ? e.bookedSlots : undefined;

      const remaining =
        typeof e.remaining === "number"
          ? e.remaining
          : typeof capacity === "number" && typeof booked === "number"
          ? Math.max(capacity - booked, 0)
          : undefined;

      return {
        id: e.id ?? e._id ?? e.eventId ?? "",
        title: e.title ?? e.name ?? "",
        location: e.location ?? e.venue,
        startsAt:
          e.startsAt ?? e.startAt ?? e.start_date ?? new Date().toISOString(),
        remaining,
        capacity,
        bookedSlots: booked,
      } as EventItem;
    });
  } catch {
    return [];
  }
}

export default async function Trending({
  limit = 4,
  title = "Trending events",
}: {
  limit?: number;
  title?: string;
}) {
  const items = await fetchTrending(limit);

  return (
    <section aria-label="Trending" className="space-y-4 select-none">
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button asChild variant="outline">
          <Link href="/events">Show all events</Link>
        </Button>
      </div>

      {items.length > 0 ? (
        <InfiniteMovingCards items={items} direction="left" speed="normal" />
      ) : (
        <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
      )}
    </section>
  );
}
