"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LogOut,
  Menu,
  Scissors,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useStudio } from "@/features/studio/store";
import { BRANCH_LABEL } from "@/shared/lib/types";
import { cn } from "@/shared/lib/cn";

const PRO_LINKS = [
  { href: "/app", label: "Agenda", icon: CalendarDays },
  { href: "/app/procedimentos", label: "Procedimentos", icon: Scissors },
  { href: "/app/grade", label: "Grade", icon: CalendarDays },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/perfil", label: "Perfil", icon: UserRound },
];

const ADMIN_LINKS = [
  { href: "/app/admin", label: "Financeiro", icon: Wallet },
  { href: "/app/admin/agendas", label: "Agendas", icon: CalendarDays },
  { href: "/app/admin/profissionais", label: "Profissionais", icon: Scissors },
  { href: "/app/admin/clientes", label: "Clientes", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout, flash, clearFlash, branchesOf } = useStudio();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mode = pathname.startsWith("/app/admin") ? "admin" : "agenda";

  if (!session) return null;

  const links = mode === "admin" ? ADMIN_LINKS : PRO_LINKS;
  const branches = branchesOf(session.id);

  return (
    <div className="min-h-screen bg-ink text-cream">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-ink-soft p-5 transition md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Artspace" width={40} height={40} />
            <div>
              <p className="font-serif text-sm tracking-[0.28em] text-cream">
                ARTSPACE
              </p>
              <p className="text-[11px] tracking-[0.2em] text-gold">BARBEARIA</p>
            </div>
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {session.isAdmin && (
          <div className="mb-6 grid grid-cols-2 rounded-full border border-line p-1">
            <Link
              href="/app"
              className={cn(
                "rounded-full py-1.5 text-center text-xs tracking-wide",
                mode === "agenda" ? "bg-gold text-ink" : "text-muted",
              )}
            >
              Agenda
            </Link>
            <Link
              href="/app/admin"
              className={cn(
                "rounded-full py-1.5 text-center text-xs tracking-wide",
                mode === "admin" ? "bg-gold text-ink" : "text-muted",
              )}
            >
              Admin
            </Link>
          </div>
        )}

        <nav className="grid gap-1">
          {links.map((link) => {
            const active =
              link.href === "/app" || link.href === "/app/admin"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm",
                  active
                    ? "bg-ink-raised text-gold"
                    : "text-cream/75 hover:bg-ink-raised",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-line bg-ink p-3">
          <p className="text-sm font-medium">{session.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
            {branches.map((branch) => BRANCH_LABEL[branch]).join(" · ") ||
              "Sem ramo"}
          </p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start px-2"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-serif tracking-[0.25em]">ARTSPACE</span>
          <span className="w-5" />
        </header>

        {flash && (
          <div
            className={cn(
              "mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm md:mx-8",
              flash.type === "error" && "border-danger/40 bg-danger/10 text-danger",
              flash.type === "ok" && "border-ok/40 bg-ok/10 text-ok",
              flash.type === "info" && "border-gold/30 bg-gold/10 text-gold-bright",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p>{flash.message}</p>
              <button type="button" onClick={clearFlash} className="text-xs">
                Fechar
              </button>
            </div>
          </div>
        )}

        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
