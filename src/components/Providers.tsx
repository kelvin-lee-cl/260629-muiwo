"use client";

import { EventProvider } from "@/contexts/EventContext";
import { StudentProvider } from "@/contexts/StudentContext";
import { StudentAppShell } from "@/components/StudentAppShell";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentProvider>
      <EventProvider>
        <StudentAppShell>{children}</StudentAppShell>
      </EventProvider>
    </StudentProvider>
  );
}
