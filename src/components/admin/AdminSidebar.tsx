// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const items = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "owner",     label: "Owner",     href: "/admin/owner" },
  { key: "staff",     label: "Staff",     href: "/admin/staff" },
  { key: "events",    label: "Events",    href: "/admin/events" },
];

export default function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const parts = pathname.split("/").filter(Boolean); // ["admin", "owner"?]
  const sub = parts[1];
  const active =
    sub === undefined
      ? "dashboard"
      : (["owner", "staff", "events"] as const).includes(sub as any)
      ? (sub as "owner" | "staff" | "events")
      : "dashboard";

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const handleClick =
    (href: string, key: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === href) return;
      e.preventDefault();
      setNavigatingTo(key);
      startTransition(() => {
        router.push(href);
      });
    };

  return (
    <nav className="rounded-2xl border border-red-100 bg-white text-red-700 p-2 shadow-sm">
      <div className="px-3 py-2">
        <p className="text-xs uppercase tracking-wide/loose text-red-500">Admin</p>
      </div>
      <ul className="space-y-1 px-2 pb-2">
        {items.map((it) => {
          const isActive = active === it.key;
          const showSpin = navigatingTo === it.key && isPending;

          const base =
            "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition";
          const nonActive = "text-red-700 hover:bg-red-50";
          const activeCls = "bg-red-50 text-red-700 font-semibold";

          return (
            <li key={it.key}>
              <Link
                href={it.href}
                onClick={handleClick(it.href, it.key)}
                className={[base, isActive ? activeCls : nonActive].join(" ")}
              >
                <span>{it.label}</span>
                {showSpin && (
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-red-600 border-t-transparent"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
