import type { ReactNode } from "react";
import { RequireProfessional } from "@/features/auth/guards";
import { AppShell } from "@/shared/components/shell/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireProfessional>
      <AppShell>{children}</AppShell>
    </RequireProfessional>
  );
}
