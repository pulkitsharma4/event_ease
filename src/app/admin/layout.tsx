// app/admin/layout.tsx
import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- ACCESS GUARD (applies to all /admin subpages) ---
  const ses = await readSession();
  if (!ses) redirect("/login?next=/admin");
  if (ses.role !== "admin") redirect("/dashboard?forbidden=admin");

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="grid gap-4 md:gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 h-max">
          <AdminSidebar />
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
