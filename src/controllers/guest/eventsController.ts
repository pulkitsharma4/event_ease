import type { NextRequest } from "next/server";
import * as eventService from "@/services/eventService";

export type EventListItem = {
  id: string;
  title: string;
  slug: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots: number;
  remaining: number;
};

export type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  sort?: "trending" | "soonest" | "fewest-left";
};

type ControllerResult<T> = { status: number; body: T };

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export async function getAllEvents(
  params: ListParams
): Promise<ControllerResult<{ items: EventListItem[] } | { error: { code: string; message: string } }>> {
  try {
    const page = clampInt(params.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER);
    const limit = clampInt(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const q = (params.q ?? "").trim() || undefined;
    const sort = params.sort ?? "trending";

    const items = await eventService.listPublicEvents({ page, limit, q, sort });
    return { status: 200, body: { items } };
  } catch {
    return { status: 500, body: { error: { code: "INTERNAL", message: "Failed to fetch events" } } };
  }
}

export async function getAllEventsHttp(req: NextRequest) {
  const url = new URL(req.url);
  const page = toOptionalInt(url.searchParams.get("page"));
  const limit = toOptionalInt(url.searchParams.get("limit"));
  const q = url.searchParams.get("q") ?? undefined;
  const sort = (url.searchParams.get("sort") as ListParams["sort"]) ?? undefined;
  return getAllEvents({ page, limit, q, sort });
}

/* helpers */
function clampInt(n: unknown, def: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.min(Math.max(v, min), max);
}
function toOptionalInt(s: string | null): number | undefined {
  if (s == null) return undefined;
  const v = Number(s);
  return Number.isFinite(v) ? v : undefined;
}
