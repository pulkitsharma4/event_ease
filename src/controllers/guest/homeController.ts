// controllers/guest/homeController.ts
import type { NextRequest } from "next/server";
import * as eventService from "@/services/eventService";

/** What the homepage needs for each trending event */
export type TrendingItem = {
  id: string;
  title: string;
  slug: string;
  location?: string;
  startsAt: string;       // ISO string
  capacity: number;
  bookedSlots: number;
  remaining: number;      // derived = capacity - bookedSlots (>= 0)
};

type ControllerResult<T> = { status: number; body: T };

/**
 * GET /api/public/home
 * Query: ?limit=4   (optional, clamped 1..12; default 4)
 * Response: { trending: TrendingItem[] }
 */
export async function getHome(
  req: NextRequest
): Promise<ControllerResult<{ trending: TrendingItem[] } | { error: { code: string; message: string } }>> {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    let limit = Number(limitParam);
    if (!Number.isFinite(limit)) limit = 4;
    if (limit < 1) limit = 1;
    if (limit > 12) limit = 12;

    const trending = await eventService.getTrendingEvents(limit);
    return { status: 200, body: { trending } };
  } catch (err) {
    // In a real app, map specific errors to 4xx; keep simple here.
    return {
      status: 500,
      body: { error: { code: "INTERNAL", message: "Something went wrong fetching homepage data" } },
    };
  }
}
