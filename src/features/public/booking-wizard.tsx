"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";
import { BRANCH_LABEL, type Branch } from "@/shared/lib/types";
import { formatBRL, formatCpf, formatPhone, minutesToLabel } from "@/shared/lib/format";
import { isSupabaseConfigured } from "@/shared/lib/supabase/env";
import { atSaoPaulo, saoPauloDateString, weekStartMonday } from "@/features/studio/rules";
import type { CatalogProcedure, PublicCatalog } from "@/features/public/catalog";
import { bookSlot, fetchSlots } from "@/features/public/public-api";
import { cn } from "@/shared/lib/cn";

type Step = "branch" | "service" | "professional" | "slot" | "account" | "done";

const BRANCHES: Branch[] = ["tattoo", "barber", "piercing"];

export function BookingWizard({
  catalog,
  presetBranch,
}: {
  catalog: PublicCatalog;
  presetBranch?: Branch | null;
}) {
  const [step, setStep] = useState<Step>(presetBranch ? "service" : "branch");
  const [branch, setBranch] = useState<Branch | null>(presetBranch ?? null);
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [procedure, setProcedure] = useState<CatalogProcedure | null>(null);
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [anchorDate, setAnchorDate] = useState(saoPauloDateString(new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cpf: "",
  });

  const branchProcedures = useMemo(
    () =>
      catalog.procedures.filter((item) => (branch ? item.branch === branch : true)),
    [branch, catalog.procedures],
  );

  const services = useMemo(() => {
    const names = new Map<string, number>();
    for (const item of branchProcedures) {
      names.set(item.name, (names.get(item.name) ?? 0) + 1);
    }
    return [...names.entries()].map(([name, count]) => ({ name, count }));
  }, [branchProcedures]);

  const staffOptions = useMemo(
    () =>
      branchProcedures.filter((item) => item.name === serviceName),
    [branchProcedures, serviceName],
  );

  const today = saoPauloDateString(new Date());
  const weekStart = weekStartMonday(anchorDate);
  const weekLabel = `${format(atSaoPaulo(weekStart, "12:00"), "d MMM", { locale: ptBR })} – ${format(
    addDays(atSaoPaulo(weekStart, "12:00"), 6),
    "d MMM",
    { locale: ptBR },
  )}`;
  const currentWeek = weekStart === weekStartMonday(today);

  const groupedSlots = useMemo(() => {
    const groups = new Map<string, { startsAt: string; endsAt: string }[]>();
    for (const slot of slots) {
      const key = format(parseISO(slot.startsAt), "yyyy-MM-dd");
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [slots]);

  async function loadSlotsFor(item: CatalogProcedure, from: string) {
    setBusy(true);
    setChosen("");
    setError("");
    try {
      setSlots(await fetchSlots(item.professionalId, item.id, from));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar horários.");
      setSlots([]);
    } finally {
      setBusy(false);
    }
  }

  async function pickProfessional(item: CatalogProcedure) {
    const from = saoPauloDateString(new Date());
    setProcedure(item);
    setAnchorDate(from);
    setStep("slot");
    await loadSlotsFor(item, from);
  }

  async function changeAnchor(next: string) {
    if (!next || !procedure) return;
    setAnchorDate(next);
    await loadSlotsFor(procedure, next);
  }

  async function goAccount() {
    if (!chosen) {
      setError("Escolha um horário.");
      return;
    }
    setError("");
    setStep("account");
  }

  async function confirmBooking() {
    if (!procedure || !chosen || busy) return;
    if (!isSupabaseConfigured()) {
      setError("Ligue o Supabase para gravar o horário.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const booked = await bookSlot({
        procedureId: procedure.id,
        startsAt: chosen,
        name: form.name,
        phone: form.phone,
        cpf: form.cpf,
      });
      if (!booked.ok) {
        setError(booked.message);
        return;
      }
      setStep("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-line bg-ink-soft p-5 sm:p-8">
      <p className="text-xs tracking-[0.28em] text-gold">AGENDAR</p>
      <h2 className="mt-2 font-serif text-3xl text-cream">Agendar</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Primeiro o atendimento, depois o profissional, depois o horário.
      </p>

      {step === "branch" && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {BRANCHES.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-3xl border border-line bg-ink px-4 py-6 text-left transition hover:border-gold/60"
              onClick={() => {
                setBranch(item);
                setServiceName(null);
                setProcedure(null);
                setStep("service");
              }}
            >
              <p className="font-serif text-2xl text-cream">{BRANCH_LABEL[item]}</p>
              <p className="mt-2 text-xs text-muted">Escolher atendimento</p>
            </button>
          ))}
        </div>
      )}

      {step === "service" && (
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => setStep("branch")}
          >
            ← Ramos
          </button>
          <p className="font-serif text-xl text-cream">Qual atendimento você quer?</p>
          {services.length === 0 && (
            <p className="text-sm text-muted">
              Ainda não há atendimentos neste ramo. A equipe cadastra na dashboard.
            </p>
          )}
          {services.map((item) => (
            <button
              key={item.name}
              type="button"
              className="rounded-2xl border border-line bg-ink px-4 py-4 text-left transition hover:border-gold/60"
              onClick={() => {
                setServiceName(item.name);
                setProcedure(null);
                setStep("professional");
              }}
            >
              <p className="text-cream">{item.name}</p>
              <p className="mt-1 text-sm text-muted">
                {item.count === 1
                  ? "1 profissional atende"
                  : `${item.count} profissionais atendem`}
              </p>
            </button>
          ))}
        </div>
      )}

      {step === "professional" && serviceName && (
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => setStep("service")}
          >
            ← Atendimentos
          </button>
          <p className="font-serif text-xl text-cream">Com quem você quer ser atendido?</p>
          <p className="text-sm text-muted">{serviceName}</p>
          {staffOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-2xl border border-line bg-ink px-4 py-4 text-left transition hover:border-gold/60"
              onClick={() => void pickProfessional(item)}
              disabled={busy}
            >
              <p className="text-cream">{item.professionalName}</p>
              <p className="mt-1 text-sm text-muted">
                {minutesToLabel(item.durationMinutes)} · {formatBRL(item.priceCents)}
              </p>
            </button>
          ))}
        </div>
      )}

      {step === "slot" && procedure && (
        <div className="mt-8 grid gap-4">
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => setStep("professional")}
          >
            ← Profissionais
          </button>
          <p className="text-sm text-cream">
            {procedure.name} com {procedure.professionalName} ·{" "}
            {minutesToLabel(procedure.durationMinutes)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted">
              {currentWeek ? "Esta semana" : "Semana escolhida"} · {weekLabel}
            </p>
            <Field
              label="Outra data"
              type="date"
              min={today}
              value={anchorDate}
              onChange={(event) => void changeAnchor(event.target.value)}
              className="sm:w-48"
            />
          </div>
          {busy && <p className="text-sm text-muted">Carregando horários…</p>}
          {!busy && groupedSlots.length === 0 && (
            <p className="text-sm text-muted">
              Nenhum horário livre nesta semana. Escolha outra data.
            </p>
          )}
          {groupedSlots.map(([day, items]) => (
            <div
              key={day}
              className={cn(
                "rounded-2xl border p-3",
                day === anchorDate ? "border-gold/50 bg-ink" : "border-line bg-ink",
              )}
            >
              <p className="mb-2 text-xs uppercase tracking-wider text-gold">
                {format(parseISO(items[0].startsAt), "EEEE, d MMM", { locale: ptBR })}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <button
                    key={item.startsAt}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm",
                      chosen === item.startsAt
                        ? "border-gold bg-gold text-ink"
                        : "border-line text-cream hover:border-gold/60",
                    )}
                    onClick={() => setChosen(item.startsAt)}
                  >
                    {format(parseISO(item.startsAt), "HH:mm")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={() => void goAccount()} disabled={!chosen || busy}>
            Continuar
          </Button>
        </div>
      )}

      {step === "account" && procedure && (
        <form
          className="mt-8 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void confirmBooking();
          }}
        >
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => setStep("slot")}
          >
            ← Horários
          </button>
          <p className="text-sm text-muted">
            {procedure.name} com {procedure.professionalName} ·{" "}
            {format(parseISO(chosen), "dd/MM 'às' HH:mm", { locale: ptBR })} ·{" "}
            {formatBRL(procedure.priceCents)}
          </p>
          <Field
            label="Nome"
            id="guest-name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Field
            label="CPF"
            id="guest-cpf"
            inputMode="numeric"
            value={formatCpf(form.cpf)}
            onChange={(event) =>
              setForm((current) => ({ ...current, cpf: event.target.value }))
            }
            required
          />
          <Field
            label="Telefone"
            id="guest-phone"
            inputMode="tel"
            autoComplete="tel"
            value={formatPhone(form.phone)}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Reservando…" : "Confirmar agendamento"}
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-8 grid gap-4">
          <p className="text-lg text-ok">Horário reservado.</p>
          <p className="text-sm text-muted">
            A equipe vê o atendimento na agenda. Se precisar, fale com o estúdio pelo WhatsApp.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/#agendar"
              className="inline-flex h-10 items-center rounded-full bg-gold px-4 text-sm text-ink"
              onClick={() => {
                setStep("branch");
                setServiceName(null);
                setProcedure(null);
                setChosen("");
              }}
            >
              Agendar outro
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
