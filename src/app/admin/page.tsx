// app/admin/page.tsx
import { cookies } from "next/headers";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

async function fetchAdminStats() {
  const res = await fetch(`${BASE_URL}/api/auth/admin/stats`, {
    cache: "no-store",
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) return { totalUsers: 0, totalOwners: 0, totalStaff: 0 };
  const json = await res.json();
  return json?.data ?? { totalUsers: 0, totalOwners: 0, totalStaff: 0 };
}

export default async function AdminPage() {
  const stats = await fetchAdminStats();

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <section className="space-y-2">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500">Overview & quick totals</p>
      </section>

      {/* Stat cards with red accents */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border shadow-sm">
          <div className="h-1 w-full rounded-t-2xl bg-red-500" />
          <div className="p-4">
            <p className="text-xs text-gray-500">Total Users</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="rounded-2xl border shadow-sm">
          <div className="h-1 w-full rounded-t-2xl bg-red-500" />
          <div className="p-4">
            <p className="text-xs text-gray-500">Total Owners</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.totalOwners}</p>
          </div>
        </div>

        <div className="rounded-2xl border shadow-sm">
          <div className="h-1 w-full rounded-t-2xl bg-red-500" />
          <div className="p-4">
            <p className="text-xs text-gray-500">Total Staff</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.totalStaff}</p>
          </div>
        </div>
      </section>

      {/* Secondary section frame */}
      <section className="rounded-2xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium">Users</h2>
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
            demo
          </span>
        </div>
        <div className="p-4 text-sm text-gray-500">
          More admin widgets will appear here.
        </div>
      </section>
    </main>
  );
}
