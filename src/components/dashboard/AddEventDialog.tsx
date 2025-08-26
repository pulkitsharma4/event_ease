"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRoutes } from "@/config/api";
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
import type { SubmitHandler } from "react-hook-form";

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
// RHF v7’s 3 generics: <TFieldValues, TContext, TTransformedValues>
type FormInput = z.input<Schema>;      // BEFORE resolver (capacity: unknown)
type FormOutput = z.output<Schema>;    // AFTER resolver  (capacity: number)

export type CreatedEvent = {
  id: string;
  title: string;
  slug: string;
  location?: string;
  startsAt: string; // ISO
  capacity: number;
  bookedSlots: number;
};

// Convert <input type="datetime-local"> (local time, no TZ) to ISO UTC
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

export default function AddEventDialog({
  onCreated,
}: {
  onCreated?: (ev: CreatedEvent) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      startsAtLocal: "",
      location: "",
      capacity: 100,  // ok: number is assignable to unknown (FormInput)
      slug: "",
    } satisfies Partial<FormInput>,
  });

  const onSubmit: SubmitHandler<FormOutput> = async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        title: values.title.trim(),
        startsAt: localDateTimeToISO(values.startsAtLocal),
        location: values.location?.trim() || undefined,
        capacity: values.capacity, // number (post-transform)
        slug: values.slug?.trim() || undefined,
      };

      const res = await fetch(apiRoutes.auth.events.base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.success !== true) {
        throw new Error(
          data?.error === "INVALID_INPUT"
            ? "Please fix the highlighted fields."
            : "Could not create event."
        );
      }

      onCreated?.(data.item as CreatedEvent);
      setOpen(false);
      form.reset();
    } catch (e: any) {
      setServerError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add event</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>Provide the details below.</DialogDescription>
        </DialogHeader>

        {/* Let inference use the same generics as the form you pass in */}
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

              {/* capacity is unknown on input; keep value controlled as string/number */}
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
              {submitting ? "Creating…" : "Create event"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
