"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditEventDialog from "@/components/events/EditEventDialog";
import DeleteEventButton from "@/components/events/DeleteEventButton";

type UpdatedEvent = {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  startsAt: string;
  capacity: number;
  bookedSlots: number;
  ownerId: string;
};

export type EventCardProps = {
  // event data
  id: string;
  title: string;
  location?: string;
  startsAt: string;     // ISO string
  remaining: number;    // capacity - bookedSlots
  capacity: number;
  bookedSlots: number;
  slug?: string;
  ownerId: string;

  // auth context
  currentUserId: string | null;
  currentRole: "owner" | "staff" | "admin";

  // callbacks
  onUpdated?: (ev: UpdatedEvent) => void;
  onDeleted?: (id: string) => void;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export default function EventCard({
  id,
  title,
  location,
  startsAt,
  remaining,
  capacity,
  bookedSlots,
  slug,
  ownerId,
  currentUserId,
  currentRole,
  onUpdated,
  onDeleted,
}: EventCardProps) {
  // robust gating: still allow in "My events" even if ownerId was missing from API
  const effectiveOwnerId = ownerId || currentUserId || null;
  const canEdit =
    currentRole === "admin" ||
    (currentUserId &&
      effectiveOwnerId &&
      String(effectiveOwnerId) === String(currentUserId));

  const eventForEdit = {
    id,
    title,
    slug,
    location,
    startsAt,
    capacity,
    bookedSlots,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground space-y-2">
        {location && <p>{location}</p>}
        <p>{formatDate(startsAt)}</p>
        <p>
          <span className="font-medium text-foreground">{Math.max(0, remaining)}</span>{" "}
          spots left
        </p>

        {canEdit && (
          <div className="pt-2 flex gap-2">
            <EditEventDialog
              event={eventForEdit}
              onUpdated={(updated) =>
                onUpdated?.({
                  ...updated,
                  ownerId: effectiveOwnerId as string, // ensure parent gets ownerId
                })
              }
            />
            <DeleteEventButton
              eventId={id}
              onDeleted={() => onDeleted?.(id)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
