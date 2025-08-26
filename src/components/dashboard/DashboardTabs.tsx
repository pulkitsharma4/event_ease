// src/components/dashboard/DashboardTabs.tsx
"use client";

import * as React from "react";
import type { UserRole } from "@/models/User";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyEventsPanel from "./MyEventsPanel";
import AllEventsPanel from "./AllEventsPanel";
import AssignedEventsPanel from "./AssignedEventsPanel";

type Props = {
  role: Extract<UserRole, "owner" | "staff" | "admin">; // server session role
  defaultTab?: "events" | "my" | "assigned";
  currentUserId: string;
  currentRole: "owner" | "staff"; // kept for MyEventsPanel compatibility
};

export default function DashboardTabs({
  role,
  defaultTab = "events",
  currentUserId,
  currentRole,
}: Props) {
  // Normalize role strictly from server session (do NOT fall back to currentRole for this)
  const normRole = ((role as string) || "owner").trim().toLowerCase() as
    | "owner"
    | "staff"
    | "admin";

  // Visibility flags
  const showAssigned =
    normRole === "staff" || (currentRole as string)?.toLowerCase() === "staff";

  // ✅ NEW: Allow "My events" tab if either session role is owner OR currentRole says owner
 const showMy =
  normRole === "owner" ||
  normRole === "staff" ||
  ["owner", "staff"].includes((currentRole as string)?.toLowerCase());
  // Initial tab selection:
  // - If caller explicitly passed defaultTab, respect it
  // - Else prefer Assigned for staff, else My for owner, else Events
  const initialTab: "events" | "my" | "assigned" =
    defaultTab ??
    (showAssigned ? "assigned" : showMy ? "my" : "events");

  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="mt-4">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>

          {showMy && <TabsTrigger value="my">My events</TabsTrigger>}

          {showAssigned && <TabsTrigger value="assigned">Assigned</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="events" className="mt-6">
        <AllEventsPanel />
      </TabsContent>

      {showMy && (
        <TabsContent value="my" className="mt-6">
          <MyEventsPanel
            currentUserId={currentUserId}
            currentRole={currentRole}
          />
        </TabsContent>
      )}

      {showAssigned && (
        <TabsContent value="assigned" className="mt-6">
          <AssignedEventsPanel />
        </TabsContent>
      )}
    </Tabs>
  );
}
