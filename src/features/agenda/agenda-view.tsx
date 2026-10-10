"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppointmentForm } from "@/features/agenda/appointment-form";
import { blockWindows, isFullDayBlock } from "@/features/studio/rules";
import { useStudio } from "@/features/studio/store";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { cn } from "@/shared/lib/cn";
import {
  formatBRL,
  formatTime,
  minutesToLabel,
} from "@/shared/lib/format";
import {
  STATUS_LABEL,
  type Appointment,
  type AppointmentStatus,
} from "@/shared/lib/types";

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  scheduled: "border-line text-muted",
  confirmed: "border-gold/50 text-gold-bright",
  present: "border-ok/50 text-ok",
  no_show: "border-danger/40 text-danger",
  rescheduled: "border-line text-muted/60 line-through",
};

export function AgendaView({
  professionalId,
  professionalName,
  adminView,
}: {
  professionalId: string;
  professionalName: string;
  adminView?: boolean;
}) {
  const { state, setAppointmentStatus, rescheduleAppointment, deleteAppointment } =
    useStudio();
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState<"week" | "day">("week");
  const [openForm, setOpenForm] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nextStart, setNextStart] = useState("");
  const [error, setError] = useState("");
  const [busyDelete, setBusyDelete] = useState(false);

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayList = mode === "day" ? [cursor] : days;

  const items = useMemo(
    () =>
      state.appointments
        .filter((item) => item.professionalId === professionalId)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [professionalId, state.appointments],
  );

  function clientName(appointment: Appointment) {
    return (
      state.profiles.find((profile) => profile.id === appointment.clientId)
        ?.name ?? "Cliente"
    );
  }

  function procedureName(appointment: Appointment) {
    return (
      state.procedures.find((item) => item.id === appointment.procedureId)
        ?.name ?? "Procedimento"
    );
  }

  async function submitReschedule(event: FormEvent) {
    event.preventDefault();
    if (!rescheduleId) return;
    const result = await rescheduleAppointment(rescheduleId, nextStart);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRescheduleId(null);
    setError("");
  }

  const deleteTarget = items.find((item) => item.id === deleteId);

  async function confirmDelete() {
    if (!deleteId || busyDelete) return;
    setBusyDelete(true);
    const result = await deleteAppointment(deleteId);
    setBusyDelete(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDeleteId(null);
    setError("");
  }

  return (
    <section className="grid gap-5">
      {adminView && (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-bright">
          Você está editando a agenda de <strong>{professionalName}</strong>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-gold">AGENDA</p>
          <h1 className="font-serif text-3xl tracking-wide text-cream">
            {professionalName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-2 rounded-full border border-line p-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                mode === "day" ? "bg-gold text-ink" : "text-muted",
              )}
              onClick={() => setMode("day")}
            >
              Dia
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                mode === "week" ? "bg-gold text-ink" : "text-muted",
              )}
              onClick={() => setMode("week")}
            >
              Semana
            </button>
          </div>
          <Button
            variant="line"
            onClick={() =>
              setCursor((current) =>
                mode === "day" ? addDays(current, -1) : addWeeks(current, -1),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="line" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button
            variant="line"
            onClick={() =>
              setCursor((current) =>
                mode === "day" ? addDays(current, 1) : addWeeks(current, 1),
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => setOpenForm(true)}>
            <Plus className="h-4 w-4" />
            Encaixe
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3",
          mode === "week" && "md:grid-cols-7",
        )}
      >
        {dayList.map((day) => {
          const dayItems = items.filter((item) =>
            isSameDay(parseISO(item.startsAt), day),
          );
          const dayBlocks = state.availabilityBlocks.filter(
            (item) =>
              item.professionalId === professionalId &&
              item.date === format(day, "yyyy-MM-dd"),
          );
          const blocked = dayBlocks.some((item) => isFullDayBlock(item));
          const partial = dayBlocks.filter((item) => !isFullDayBlock(item));

          return (
            <article
              key={day.toISOString()}
              className="rounded-3xl border border-line bg-ink-soft p-3"
            >
              <header className="mb-3">
                <p className="text-[11px] uppercase tracking-wider text-gold">
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <p className="text-lg text-cream">{format(day, "d MMM")}</p>
                {blocked && (
                  <p className="mt-1 text-xs text-danger">Agenda fechada</p>
                )}
                {partial.flatMap((item) => {
                  const windows = blockWindows(item) ?? [];
                  return windows.map((window) => (
                    <p key={`${item.id}-${window.start}`} className="mt-1 text-xs text-danger">
                      Fechado {window.start}–{window.end}
                    </p>
                  ));
                })}
              </header>
              <div className="grid gap-2">
                {dayItems.length === 0 && (
                  <p className="text-sm text-muted">Nenhum horário neste dia.</p>
                )}
                {dayItems.map((item) => (
                  <article
                    key={item.id}
                    className={cn(
                      "rounded-2xl border bg-ink p-3",
                      STATUS_STYLE[item.status],
                    )}
                  >
                    <p className="text-xs uppercase tracking-wide">
                      {STATUS_LABEL[item.status]}
                    </p>
                    <p className="mt-1 font-medium text-cream">
                      {formatTime(item.startsAt)}–{formatTime(item.endsAt)}
                    </p>
                    <p className="text-sm">{clientName(item)}</p>
                    <p className="text-xs text-muted">
                      {procedureName(item)} · {minutesToLabel(
                        (new Date(item.endsAt).getTime() -
                          new Date(item.startsAt).getTime()) /
                          60000,
                      )}{" "}
                      · {formatBRL(item.priceCents)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.status !== "rescheduled" && (
                        <>
                          {(
                            [
                              "confirmed",
                              "present",
                              "no_show",
                            ] as const
                          ).map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={cn(
                                "rounded-full border px-2 py-1 text-[11px]",
                                item.status === status
                                  ? "border-gold bg-gold/15 text-gold-bright"
                                  : "border-line text-muted hover:text-cream",
                              )}
                              onClick={() => void setAppointmentStatus(item.id, status)}
                            >
                              {STATUS_LABEL[status]}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="rounded-full border border-line px-2 py-1 text-[11px] text-muted hover:text-cream"
                            onClick={() => {
                              setRescheduleId(item.id);
                              setNextStart(
                                format(parseISO(item.startsAt), "yyyy-MM-dd'T'HH:mm"),
                              );
                              setError("");
                            }}
                          >
                            Remarcar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="rounded-full border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                        onClick={() => {
                          setDeleteId(item.id);
                          setError("");
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {openForm && (
        <AppointmentForm
          professionalId={professionalId}
          onClose={() => setOpenForm(false)}
        />
      )}

      {rescheduleId && (
        <Modal title="Remarcar atendimento" onClose={() => setRescheduleId(null)}>
          <form className="grid gap-3" onSubmit={submitReschedule}>
            <p className="text-sm text-muted">
              O horário antigo será liberado. Informe o novo encaixe.
            </p>
            <Field
              label="Novo horário"
              type="datetime-local"
              value={nextStart}
              onChange={(event) => setNextStart(event.target.value)}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit">Confirmar remarcação</Button>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir agendamento" onClose={() => setDeleteId(null)}>
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              {deleteTarget
                ? `Remover ${clientName(deleteTarget)} (${formatTime(deleteTarget.startsAt)}–${formatTime(deleteTarget.endsAt)})? O horário volta a ficar livre.`
                : "Remover este atendimento? O horário volta a ficar livre."}
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="line" onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={busyDelete}
                onClick={() => void confirmDelete()}
              >
                {busyDelete ? "Excluindo…" : "Confirmar exclusão"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
