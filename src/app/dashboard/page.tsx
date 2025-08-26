import DashboardTabs from "@/components/dashboard/DashboardTabs";
import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";


export default async function DashboardPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  // use the real role from session
  if (session?.role === "admin") {
    redirect("/admin");
  }
  const role = (session.role ?? "").toLowerCase() as "owner" | "staff" | "admin";

  return (
    <section className="px-5 py-10">
      <DashboardTabs
        role={role}
        currentUserId={session.sub}
        currentRole={role === "staff" ? "staff" : "owner"} // keep MyEventsPanel unchanged
      />
    </section>
  );
}
