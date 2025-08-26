// src/services/rsvpService.ts
import mongoose, { Types } from "mongoose";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { RSVPModel } from "@/models/RSVP";

export type CreateRsvpInput = {
    eventId: string;     // ObjectId string
    name: string;
    email: string;
    quantity: number;    // >= 1
};

export type CreateRsvpResult =
    | { success: true; rsvpId: string; remainingAfter: number }
    | { success: false; error: "INVALID_INPUT" | "INSUFFICIENT_SPOTS" | "EVENT_PAST" | "ALREADY_RSVPED" | "INTERNAL_ERROR" };

function toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return new Types.ObjectId(id);
}

export async function createRsvp(input: CreateRsvpInput): Promise<CreateRsvpResult> {
    const eventIdObj = toObjectId(input.eventId);
    const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
    const name = (input.name ?? "").trim();
    const email = (input.email ?? "").trim().toLowerCase();

    if (!eventIdObj || !name || !email || qty < 1) {
        return { success: false, error: "INVALID_INPUT" };
    }

    await dbConnect();

    const session = await mongoose.startSession();
    try {
        let rsvpId = "";

        await session.withTransaction(async () => {
            const now = new Date();

            // 1) Ensure event is upcoming and has enough remaining spots, then atomically $inc bookedSlots.
            const incRes = await Event.updateOne(
                {
                    _id: eventIdObj,
                    startsAt: { $gte: now }, // upcoming only
                    $expr: {
                        $gte: [
                            { $subtract: [{ $ifNull: ["$capacity", 0] }, { $ifNull: ["$bookedSlots", 0] }] },
                            qty,
                        ],
                    },
                },
                {
                    $inc: { bookedSlots: qty },
                    $set: { updatedAt: new Date() },
                },
                { session }
            );

            if (incRes.modifiedCount !== 1) {
                // Check if event is already past (distinct error helps UX)
                const ev = await Event.findById(eventIdObj)
                    .select("startsAt")
                    .session(session)
                    .lean<{ startsAt: Date }>();

                if (!ev || ev.startsAt < now) {
                    throw Object.assign(new Error("EVENT_PAST"), { code: "EVENT_PAST" });
                }
                throw Object.assign(new Error("INSUFFICIENT_SPOTS"), { code: "INSUFFICIENT_SPOTS" });
            }

            // 2) Create RSVP (unique on { eventId, email } per our model index)
            const created = await RSVPModel.create(
                [
                    {
                        eventId: eventIdObj,
                        name,
                        email,
                        qty,
                    },
                ],
                { session }
            );

            rsvpId = (created[0]._id as Types.ObjectId).toHexString();

            // Optional: we could compute remainingAfter here, but we'll fetch it below.
        });

        // 3) After successful commit, compute remaining to return (non-transactional read is fine post-commit)
        const ev2 = await Event.findById(eventIdObj)
            .select("capacity bookedSlots")
            .lean<{ capacity: number; bookedSlots: number }>();

        const remainingAfter = Math.max(
            0,
            Number(ev2?.capacity ?? 0) - Number(ev2?.bookedSlots ?? 0)
        );

        return { success: true, rsvpId, remainingAfter };
    } catch (err: any) {
        // Duplicate RSVP (unique index on {eventId,email})
        if (err?.code === 11000) {
            return { success: false, error: "ALREADY_RSVPED" };
        }
        // Mapped errors from above
        if (err?.code === "INSUFFICIENT_SPOTS") return { success: false, error: "INSUFFICIENT_SPOTS" };
        if (err?.code === "EVENT_PAST") return { success: false, error: "EVENT_PAST" };
        return { success: false, error: "INTERNAL_ERROR" };
    } finally {
        await session.endSession();
    }
}
