"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRoutes } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  eventId: string;
  triggerLabel?: string;
  onSuccess?: (data: { rsvpId: string; remainingAfter: number }) => void;
  /** Maximum seats user can book; usually the event's remaining spots */
  maxQty?: number;
};

export default function BookingDialog({
  eventId,
  triggerLabel = "Book Slot",
  onSuccess,
  maxQty,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // normalize max
  const allowedMax = Number.isFinite(maxQty as number)
    ? Math.max(0, Math.floor(Number(maxQty)))
    : Infinity;

  const isSoldOut = allowedMax === 0;

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () =>
    setQty((q) =>
      allowedMax === Infinity ? q + 1 : Math.min(allowedMax, q + 1)
    );

  async function handleReserve() {
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(apiRoutes.public.rsvp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim() || undefined, // optional
          quantity: qty,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const code = data?.error ?? "INTERNAL_ERROR";
        const msg =
          code === "INVALID_INPUT"
            ? "Please fill required fields correctly."
            : code === "INSUFFICIENT_SPOTS"
            ? "Not enough spots left."
            : code === "ALREADY_RSVPED"
            ? "You already reserved for this event with this email."
            : code === "EVENT_PAST"
            ? "This event has already started."
            : "Something went wrong. Please try again.";
        throw new Error(msg);
      }

      setOkMsg("Reservation confirmed!");
      onSuccess?.({ rsvpId: data.rsvpId, remainingAfter: data.remainingAfter });

      // Auto-refresh the page so "spots left" updates
      router.refresh();
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to reserve.");
    } finally {
      setSubmitting(false);
    }
  }

  const qtyValid = qty >= 1 && (allowedMax === Infinity || qty <= allowedMax);
  const canSubmit = !submitting && name.trim() && email.trim() && qtyValid && !isSoldOut;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={isSoldOut}>
          {isSoldOut ? "Sold out" : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve your slot</DialogTitle>
          <DialogDescription>Enter your details to book seat(s) for this event.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mobile">Mobile (optional)</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="+91 9xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>
              Quantity {Number.isFinite(allowedMax) ? `(max ${allowedMax})` : ""}
            </Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={dec} disabled={submitting || qty <= 1}>
                –
              </Button>
              <span className="min-w-8 text-center">{qty}</span>
              <Button
                type="button"
                variant="outline"
                onClick={inc}
                disabled={submitting || (Number.isFinite(allowedMax) && qty >= (allowedMax as number))}
              >
                +
              </Button>
            </div>
            {!qtyValid && (
              <p className="text-xs text-destructive">Quantity must be between 1 and {allowedMax}.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {okMsg && <p className="text-sm text-green-600">{okMsg}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleReserve} disabled={!canSubmit}>
            {submitting ? "Reserving…" : "Reserve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
