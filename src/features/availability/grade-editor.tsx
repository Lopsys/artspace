"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useStudio } from "@/features/studio/store";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function GradeEditor({ professionalId }: { professionalId: string }) {
  const { state, saveAvailabilityRule, toggleDayBlock } = useStudio();
  const [error, setError] = useState("");
  const week = Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index),
  );

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs tracking-[0.25em] text-gold">DISPONIBILIDADE</p>
        <h1 className="font-serif text-3xl tracking-wide">Grade</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A grade define os dias em que você atende. Fechar um dia só afeta a sua
          agenda.
        </p>
      </div>

      <div className="grid gap-3">
        {WEEKDAYS.map((day) => {
          const rule = state.availabilityRules.find(
            (item) =>
              item.professionalId === professionalId && item.weekday === day.value,
          );
          return (
            <form
              key={day.value}
              className="grid items-end gap-3 rounded-3xl border border-line bg-ink-soft p-4 md:grid-cols-[140px_1fr_1fr_120px_auto]"
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const result = await saveAvailabilityRule({
                  professionalId,
                  weekday: day.value,
                  start: String(data.get("start") || "09:00"),
                  end: String(data.get("end") || "19:00"),
                  slotMinutes: Number(data.get("slot") || 30),
                });
                setError(result.ok ? "" : result.message);
              }}
            >
              <p className="text-sm text-cream">{day.label}</p>
              <Field
                label="Início"
                name="start"
                type="time"
                defaultValue={rule?.start ?? "09:00"}
              />
              <Field
                label="Fim"
                name="end"
                type="time"
                defaultValue={rule?.end ?? "19:00"}
              />
              <Field
                label="Intervalo"
                name="slot"
                type="number"
                min={10}
                defaultValue={rule?.slotMinutes ?? 30}
              />
              <Button type="submit" variant="line">
                Salvar
              </Button>
            </form>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <h2 className="mb-3 text-sm tracking-[0.2em] text-gold">ESTA SEMANA</h2>
        <div className="grid gap-2 md:grid-cols-7">
          {week.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const blocked = state.availabilityBlocks.some(
              (item) =>
                item.professionalId === professionalId && item.date === date,
            );
            return (
              <button
                key={date}
                type="button"
                onClick={() => void toggleDayBlock(professionalId, date)}
                className={`rounded-3xl border p-4 text-left ${
                  blocked
                    ? "border-danger/40 bg-danger/10"
                    : "border-line bg-ink-soft"
                }`}
              >
                <p className="text-xs uppercase text-gold">
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <p className="text-lg">{format(day, "d")}</p>
                <p className="mt-2 text-xs text-muted">
                  {blocked ? "Fechada — toque para abrir" : "Aberta — toque para fechar"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
