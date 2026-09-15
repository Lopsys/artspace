"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { formatBRL, formatDate, formatTime } from "@/shared/lib/format";
import { STATUS_LABEL, type AppointmentStatus } from "@/shared/lib/types";
import { getSupabase } from "@/shared/lib/supabase/client";
import { isSupabaseConfigured } from "@/shared/lib/supabase/env";
import { cancelMyAppointment, fetchMyAppointments } from "@/features/public/public-api";

type Row = {
  id: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  status: string;
  procedureName: string;
  professionalName: string;
};

export function MyAppointments() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!isSupabaseConfigured()) {
          if (!cancelled) startTransition(() => setReady(true));
          return;
        }
        const { data } = await getSupabase().auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          startTransition(() => {
            setAuthed(false);
            setReady(true);
          });
          return;
        }
        const payload = await fetchMyAppointments();
        if (cancelled) return;
        startTransition(() => {
          setAuthed(true);
          setName(payload.clientName ?? "");
          setRows(payload.appointments);
          setReady(true);
        });
      } catch (cause: unknown) {
        if (cancelled) return;
        startTransition(() => {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar.");
          setReady(true);
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function cancel(id: string) {
    setError("");
    const result = await cancelMyAppointment(id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const payload = await fetchMyAppointments();
    setName(payload.clientName ?? "");
    setRows(payload.appointments);
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-muted">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Artspace" width={36} height={36} />
            <span className="font-serif tracking-[0.28em]">ARTSPACE</span>
          </Link>
          <div className="flex gap-3 text-sm">
            <Link href="/#agendar" className="text-gold">
              Agendar
            </Link>
            {authed && (
              <button
                type="button"
                className="text-muted"
                onClick={() => {
                  void getSupabase().auth.signOut().then(() => router.push("/"));
                }}
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-10">
        <div>
          <p className="text-xs tracking-[0.28em] text-gold">MINHA CONTA</p>
          <h1 className="font-serif text-4xl">Meus horários</h1>
          {name && <p className="mt-2 text-muted">{name}</p>}
        </div>

        {!authed && (
          <p className="text-sm text-muted">
            Entre com o e-mail do agendamento para ver seus horários.{" "}
            <Link href="/login?next=/conta" className="text-gold">
              Ir ao login
            </Link>
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {authed && rows.length === 0 && (
          <p className="text-sm text-muted">Nenhum horário nesta conta ainda.</p>
        )}

        {rows.map((item) => {
          const future =
            new Date(item.startsAt) > new Date() &&
            (item.status === "scheduled" || item.status === "confirmed");
          return (
            <article key={item.id} className="rounded-3xl border border-line bg-ink-soft p-5">
              <p className="text-xs uppercase tracking-wider text-gold">
                {STATUS_LABEL[item.status as AppointmentStatus] ?? item.status}
              </p>
              <p className="mt-1 text-lg text-cream">
                {formatDate(item.startsAt)} · {formatTime(item.startsAt)}–
                {formatTime(item.endsAt)}
              </p>
              <p className="text-sm text-muted">
                {item.procedureName} com {item.professionalName} · {formatBRL(item.priceCents)}
              </p>
              {future && (
                <Button
                  variant="danger"
                  className="mt-4"
                  onClick={() => {
                    if (window.confirm("Cancelar este horário? Ele volta a ficar livre.")) {
                      void cancel(item.id);
                    }
                  }}
                >
                  Cancelar
                </Button>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}
