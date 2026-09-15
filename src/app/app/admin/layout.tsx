import type { ReactNode } from "react";
import { RequireAdmin } from "@/features/auth/guards";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
