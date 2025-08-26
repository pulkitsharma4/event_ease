"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRoutes } from "@/config/api";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await fetch(apiRoutes.public.auth.logout, { method: "POST" });
      router.push("/");   // back to public home
      router.refresh();   // refresh Navbar/session UI
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? "Logging out…" : "Log out"}
    </Button>
  );
}
