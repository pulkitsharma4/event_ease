// app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";

type Role = "owner" | "staff" | "admin";
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked?: boolean;
  eventCount: number;
};

export default function AdminStaffPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/auth/admin/users?role=staff`, { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) throw new Error(`Failed: ${r.status} ${await r.text().catch(() => "")}`);
        return r.json();
      })
      .then((json) => {
        if (!alive) return;
        setItems(Array.isArray(json?.items) ? json.items : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load staff");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="space-y-5">
      {/* Header with subtle red accent */}
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <h1 className="text-xl font-semibold">Staff</h1>
        </div>
        <p className="text-sm text-gray-500">
          All users with role <span className="font-medium text-red-600">staff</span>.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !items.length
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-red-50" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-red-50" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-red-50" />
                  <div className="h-6 w-20 animate-pulse rounded bg-red-50" />
                </div>
              </div>
            ))
          : items.length
          ? items.map((u) => (
              <article key={u.id} className="rounded-xl border shadow-sm">
                <div className="h-1 w-full rounded-t-2xl bg-red-500" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {u.name || "—"}{" "}
                        {u.isBlocked ? (
                          <span className="ml-2 align-middle rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-700">
                            Blocked
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-gray-500">{u.email || "—"}</p>
                    </div>
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                      staff
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-gray-600">
                    Events created: <strong className="text-red-600">{u.eventCount}</strong>
                  </div>
                </div>
              </article>
            ))
          : (
            <div className="col-span-full rounded-xl border p-6 text-center text-sm text-gray-500">
              No staff users found.
            </div>
          )}
      </section>
    </main>
  );
}
