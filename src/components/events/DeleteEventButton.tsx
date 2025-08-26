"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function DeleteEventButton({
  eventId,
  disabled,
  onDeleted,
  confirmText = "Are you sure you want to delete this event? This action cannot be undone.",
  label = "Delete",
}: {
  eventId: string;
  disabled?: boolean;
  onDeleted?: () => void;
  confirmText?: string;
  label?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (loading) return;
    const ok = typeof window !== "undefined" && window.confirm(confirmText);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.success !== true) {
        throw new Error(data?.message || "Could not delete event.");
      }
      onDeleted?.();
    } catch (e: any) {
      // Replace with your toast if you use one
      console.error(e);
      alert(e?.message || "Something went wrong while deleting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={disabled || loading}
      onClick={handleDelete}
    >
      {loading ? "Deleting…" : label}
    </Button>
  );
}
