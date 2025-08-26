// app/admin/owner/page.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Role = "owner" | "staff" | "admin";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked?: boolean;
  eventCount: number;
};

const BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  (typeof window !== "undefined" ? "" : "");

export default function AdminOwnerPage() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const q = sp.get("q") ?? "";
  const [query, setQuery] = useState(q);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setQuery(q), [q]);

  // Fetch users (all roles) with optional search
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const url = `${BASE}/api/auth/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`;

    fetch(url, { cache: "no-store" })
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
        setError(e?.message || "Failed to load users");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [q]);

  // Search handler (syncs with URL)
  const onSearchChange = (val: string) => {
    setQuery(val);
    const np = new URLSearchParams(sp.toString());
    if (val.trim()) np.set("q", val.trim());
    else np.delete("q");
    router.replace(`${pathname}?${np.toString()}`);
  };

  // Actions
  const toggleBlock = async (user: UserRow) => {
    const prev = items;
    setItems((list) =>
      list.map((it) => (it.id === user.id ? { ...it, isBlocked: !it.isBlocked } : it))
    );

    const url = user.isBlocked
      ? `${BASE}/api/auth/admin/users/${user.id}/unblock`
      : `${BASE}/api/auth/admin/users/${user.id}/block`;

    const res = await fetch(url, { method: "PATCH" });
    if (!res.ok) {
      setItems(prev); // revert on failure
      // Optional: console.error(await res.text().catch(() => ""));
    }
  };

  const assignRole = async (user: UserRow, role: Role) => {
    if (role === user.role) return;
    const prev = items;
    setItems((list) => list.map((it) => (it.id === user.id ? { ...it, role } : it)));

    const res = await fetch(`${BASE}/api/auth/admin/users/${user.id}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      setItems(prev); // revert on failure
      // Optional: console.error(await res.text().catch(() => ""));
    }
  };

  return (
    <main className="space-y-5">
      {/* Header with subtle red accent */}
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <h1 className="text-xl font-semibold">Users</h1>
        </div>
        <p className="text-sm text-gray-500">
          Manage all users (<span className="text-red-600 font-medium">owner</span>,{" "}
          <span className="text-red-600 font-medium">staff</span>,{" "}
          <span className="text-red-600 font-medium">admin</span>)
        </p>
      </header>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ring-red-200"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {loading ? "Searching…" : "Search"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid of user cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !items.length ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border shadow-sm">
              <div className="h-1 w-full rounded-t-2xl bg-red-100" />
              <div className="p-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-red-50" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-red-50" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-red-50" />
                  <div className="h-6 w-24 animate-pulse rounded bg-red-50" />
                </div>
              </div>
            </div>
          ))
        ) : items.length ? (
          items.map((u) => (
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
                    {u.role}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                  <span>
                    Events created:{" "}
                    <strong className="text-red-600">{u.eventCount}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBlock(u)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                      title={u.isBlocked ? "Unblock user" : "Block user"}
                    >
                      {u.isBlocked ? "Unblock" : "Block"}
                    </button>

                    <RoleSelect
                      value={u.role}
                      onChange={(role) => assignRole(u, role)}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full rounded-xl border p-6 text-center text-sm text-gray-500">
            No users found.
          </div>
        )}
      </section>
    </main>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[11px]">
      <span className="text-gray-500">Role</span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as Role)}
        className="rounded-lg border border-red-200 px-2 py-1 text-[11px] outline-none hover:bg-red-50 focus:ring-2 ring-red-200"
      >
        <option value="owner">owner</option>
        <option value="staff">staff</option>
        <option value="admin">admin</option>
      </select>
    </label>
  );
}
