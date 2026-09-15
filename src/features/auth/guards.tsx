"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudio } from "@/features/studio/store";

export function RequireProfessional({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, session, accountKind } = useStudio();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (accountKind === "client") {
      router.replace("/conta");
      return;
    }
    if (!session || session.role !== "professional") {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [accountKind, pathname, ready, router, session]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-muted">
        Carregando Artspace…
      </div>
    );
  }

  if (!session || session.role !== "professional") return null;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { ready, session } = useStudio();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login?next=/app/admin");
      return;
    }
    if (!session.isAdmin) router.replace("/app");
  }, [ready, router, session]);

  if (!ready || !session?.isAdmin) return null;
  return <>{children}</>;
}
