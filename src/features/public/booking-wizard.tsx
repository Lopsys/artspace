"use client";

import { useEffect, useMemo, useState } from "react";
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

const SERVICES: Branch[] = ["tattoo", "barber", "piercing"];

export function BookingWizard({
  catalog,
  onQuoteBranch,
  professionalId,
  onBack,
}: {
  catalog: PublicCatalog;
  onQuoteBranch: (branch: "tattoo" | "piercing") => void;
  professionalId?: string | null;
  onBack?: () => void;
}) {
  const branch: Branch = "barber";
  const [step, setStep] = useState<Step>(professionalId ? "service" : "branch");
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [procedure, setProcedure] = useState<CatalogProcedure | null>(null);
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [anchorDate, setAnchorDate] = useState(saoPauloDateString(new Date()));
  const [selectedDay, setSelectedDay] = useState(saoPauloDateString(new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cpf: "",
  });

  const selectedProfessional = useMemo(
    () => catalog.professionals.find((person) => person.id === professionalId) ?? null,
    [catalog.professionals, professionalId],
  );

  const branchProcedures = useMemo(
    () =>
      catalog.procedures.filter((item) => {
        if (item.branch !== branch) return false;
        if (professionalId) return item.professionalId === professionalId;
        return true;
      }),
    [branch, catalog.procedures, professionalId],
  );

  useEffect(() => {
    if (!professionalId) return;
    setStep("service");
    setServiceName(null);
    setProcedure(null);
    setChosen("");
    setSlots([]);
    setError("");
  }, [professionalId]);

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

  const weekDays = useMemo(() => {
    const start = atSaoPaulo(weekStart, "12:00");
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = format(date, "yyyy-MM-dd");
      return {
        key,
        date,
        past: key < today,
        slots: groupedSlots.find(([day]) => day === key)?.[1] ?? [],
      };
    });
  }, [groupedSlots, today, weekStart]);

  const daySlots = weekDays.find((day) => day.key === selectedDay)?.slots ?? [];

  useEffect(() => {
    if (step !== "slot" || weekDays.length === 0) return;
    if (weekDays.some((day) => day.key === selectedDay && !day.past)) return;
    const firstOpen = weekDays.find((day) => !day.past && day.slots.length > 0);
    const firstFuture = weekDays.find((day) => !day.past);
    setSelectedDay((firstOpen ?? firstFuture ?? weekDays[0]).key);
  }, [selectedDay, step, weekDays]);

  async function loadSlotsFor(item: CatalogProcedure, from: string) {
    setBusy(true);
    setChosen("");
    setError("");
    try {
      const loaded = await fetchSlots(item.professionalId, item.id, from);
      if (loaded.length === 0 && weekStartMonday(from) === weekStartMonday(today)) {
        const nextWeek = format(addDays(atSaoPaulo(weekStartMonday(from), "12:00"), 7), "yyyy-MM-dd");
        setAnchorDate(nextWeek);
        setSelectedDay(nextWeek);
        setSlots(await fetchSlots(item.professionalId, item.id, nextWeek));
        return;
      }
      setSlots(loaded);
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
    setSelectedDay(from);
    setStep("slot");
    await loadSlotsFor(item, from);
  }

  async function changeAnchor(next: string) {
    if (!next || !procedure) return;
    setAnchorDate(next);
    setSelectedDay(next < today ? today : next);
    await loadSlotsFor(procedure, next);
  }

  async function changeWeek(direction: -1 | 1) {
    const next = format(addDays(atSaoPaulo(weekStart, "12:00"), direction * 7), "yyyy-MM-dd");
    if (direction < 0 && weekStartMonday(next) < weekStartMonday(today)) return;
    await changeAnchor(next);
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
    <div
      className={cn(
        "rounded-[2rem] border border-line bg-ink-soft p-4 sm:p-5",
        step === "slot" && "flex h-full min-h-0 flex-col",
      )}
    >
      <p className="text-xs tracking-[0.28em] text-gold">AGENDAR</p>
      <h2 className={cn("mt-1 font-serif text-cream", step === "slot" ? "text-2xl" : "text-3xl")}>
        Agendar
      </h2>
      {step !== "slot" && step !== "account" && (
        <>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Peça seu orçamento personalizado para tatuagens e piercings.
          </p>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Agende seu corte de cabelo diretamente por aqui.
          </p>
        </>
      )}

      {step === "branch" && (
        <div className="mt-8 grid gap-3">
          <p className="font-serif text-xl text-cream">O que você procura?</p>
          {SERVICES.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-2xl border border-line bg-ink px-4 py-4 text-left transition hover:border-gold/60"
              onClick={() => {
                if (item === "barber") {
                  setServiceName(null);
                  setProcedure(null);
                  setStep("service");
                  return;
                }
                onQuoteBranch(item);
              }}
            >
              <p className="text-cream">{BRANCH_LABEL[item]}</p>
              <p className="mt-1 text-sm text-muted">
                {item === "barber"
                  ? "Escolha o corte, o profissional e o horário."
                  : "Veja os profissionais e peça o orçamento."}
              </p>
            </button>
          ))}
        </div>
      )}

      {step === "service" && (
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => {
              if (onBack) onBack();
              else setStep("branch");
            }}
          >
            {onBack ? "← Voltar" : "← Serviços"}
          </button>
          <p className="font-serif text-xl text-cream">Qual corte você quer?</p>
          {selectedProfessional && (
            <p className="text-sm text-muted">Com {selectedProfessional.name}</p>
          )}
          {services.length === 0 && (
            <p className="text-sm text-muted">
              Ainda não há atendimentos neste ramo. A equipe cadastra na dashboard.
            </p>
          )}
          {services.map((item) => {
            const match = branchProcedures.find((procedureItem) => procedureItem.name === item.name);
            return (
              <button
                key={item.name}
                type="button"
                className="rounded-2xl border border-line bg-ink px-4 py-4 text-left transition hover:border-gold/60"
                onClick={() => {
                  if (professionalId && match) {
                    setServiceName(item.name);
                    void pickProfessional(match);
                    return;
                  }
                  setServiceName(item.name);
                  setProcedure(null);
                  setStep("professional");
                }}
              >
                <p className="text-cream">{item.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {professionalId && match
                    ? `${minutesToLabel(match.durationMinutes)} · ${formatBRL(match.priceCents)}`
                    : item.count === 1
                      ? "1 profissional atende"
                      : `${item.count} profissionais atendem`}
                </p>
              </button>
            );
          })}
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
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
          <button
            type="button"
            className="text-left text-sm text-gold"
            onClick={() => setStep(professionalId ? "service" : "professional")}
          >
            {professionalId ? "← Atendimentos" : "← Profissionais"}
          </button>
          <p className="text-sm text-cream">
            {procedure.name} com {procedure.professionalName} ·{" "}
            {minutesToLabel(procedure.durationMinutes)}
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-full border border-line px-3 py-1 text-sm text-cream disabled:opacity-40"
              disabled={currentWeek || busy}
              onClick={() => void changeWeek(-1)}
            >
              ←
            </button>
            <p className="text-center text-sm text-muted">
              {currentWeek ? "Esta semana" : "Semana"} · {weekLabel}
            </p>
            <button
              type="button"
              className="rounded-full border border-line px-3 py-1 text-sm text-cream disabled:opacity-40"
              disabled={busy}
              onClick={() => void changeWeek(1)}
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <button
                key={day.key}
                type="button"
                disabled={day.past || busy}
                onClick={() => {
                  setSelectedDay(day.key);
                  setChosen("");
                }}
                className={cn(
                  "rounded-xl border px-1 py-2 text-center disabled:opacity-35",
                  selectedDay === day.key
                    ? "border-gold bg-gold/15 text-cream"
                    : "border-line text-muted hover:border-gold/50",
                )}
              >
                <span className="block text-[10px] uppercase tracking-wide">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][weekDays.indexOf(day)]}
                </span>
                <span className="block text-sm text-cream">{format(day.date, "d")}</span>
              </button>
            ))}
          </div>
          {busy && <p className="text-sm text-muted">Carregando horários…</p>}
          {!busy && daySlots.length === 0 && (
            <p className="text-sm text-muted">
              Nenhum horário livre neste dia. Escolha outro.
            </p>
          )}
          <div className="grid grid-cols-6 gap-1.5">
            {daySlots.map((item) => (
              <button
                key={item.startsAt}
                type="button"
                className={cn(
                  "rounded-full border px-1 py-1.5 text-xs sm:text-sm",
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="mt-auto" onClick={() => void goAccount()} disabled={!chosen || busy}>
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
