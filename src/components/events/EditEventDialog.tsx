"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const FormSchema = z.object({
  title: z.string().min(3, "Min 3 chars").max(140),
  startsAtLocal: z.string().min(1, "Pick a date & time"),
  location: z.string().max(120).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1, "At least 1").max(100000),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, dashes")
    .max(160)
    .optional()
    .or(z.literal("")),
});

type Schema = typeof FormSchema;
type FormInput = z.input<Schema>;   // before resolver (capacity may be string/unknown)
type FormOutput = z.output<Schema>; // after resolver (capacity is number)

export type EditableEvent = {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  startsAt: string; // ISO string (UTC or offset ok)
  capacity: number;
  bookedSlots: number;
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// ISO -> value acceptable by <input type="datetime-local">
function isoToLocalInput(iso: string) {
  const d = new Date(iso);
  // build with local components
  const local = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    0,
    0
  );
  const y = local.getFullYear();
  const m = pad(local.getMonth() + 1);
  const day = pad(local.getDate());
  const hh = pad(local.getHours());
  const mm = pad(local.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// Local datetime string -> ISO (UTC)
function localDateTimeToISO(local: string) {
  const d = new Date(local);
  const rebuilt = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    0,
    0
  );
  return rebuilt.toISOString();
}

export default function EditEventDialog({
  event,
  onUpdated,
  trigger,
}: {
  event: EditableEvent;
  onUpdated?: (ev: EditableEvent) => void;
  /** Optional trigger element. If not provided, a default "Edit" button is used. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: event.title ?? "",
      startsAtLocal: isoToLocalInput(event.startsAt),
      location: event.location ?? "",
      capacity: event.capacity ?? 1,
      slug: event.slug ?? "",
    },
  });

  // If the dialog opens for a different event instance in the same mount
  React.useEffect(() => {
    if (!open) return;
    form.reset({
      title: event.title ?? "",
      startsAtLocal: isoToLocalInput(event.startsAt),
      location: event.location ?? "",
      capacity: event.capacity ?? 1,
      slug: event.slug ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, open]);

  const onSubmit = async (values: FormOutput) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        title: values.title.trim(),
        startsAt: localDateTimeToISO(values.startsAtLocal),
        location: values.location?.trim() ?? "",
        capacity: values.capacity,
        slug: values.slug?.trim() ?? "",
      };

      const res = await fetch(`/api/auth/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.success !== true) {
        throw new Error(
          data?.message ||
            (data?.error === "INVALID_INPUT"
              ? "Please fix the highlighted fields."
              : "Could not update event.")
        );
      }

      const updated = data.item as EditableEvent;
      onUpdated?.(updated);
      setOpen(false);
    } catch (e: any) {
      setServerError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update the details below.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Product Launch Night" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startsAtLocal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starts at</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Delhi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keep capacity controlled to support unknown/string before zod coercion */}
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={(field.value as number | string | undefined) ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="product-launch-night" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
