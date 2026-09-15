"use client";

import { useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { Field, SelectField } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { useStudio } from "@/features/studio/store";
import { formatBRL, formatCpf, formatPhone, minutesToLabel } from "@/shared/lib/format";
import { BRANCH_LABEL } from "@/shared/lib/types";

export function AppointmentForm({
  professionalId,
  defaultStartsAt,
  onClose,
}: {
  professionalId: string;
  defaultStartsAt?: string;
  onClose: () => void;
}) {
  const { state, createAppointment } = useStudio();
  const procedures = useMemo(
    () =>
      state.procedures.filter(
        (item) => item.professionalId === professionalId && !item.archived,
      ),
    [professionalId, state.procedures],
  );

  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cpf: "",
    email: "",
    procedureId: procedures[0]?.id ?? "",
    startsAt: defaultStartsAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await createAppointment({
      professionalId,
      procedureId: form.procedureId,
      startsAt: form.startsAt,
      client: {
        name: form.name,
        phone: form.phone,
        cpf: form.cpf,
        email: form.email,
      },
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  }

  const selected = procedures.find((item) => item.id === form.procedureId);

  return (
    <Modal title="Encaixar horário" onClose={onClose}>
      <form className="grid gap-3" onSubmit={submit}>
        {procedures.length === 0 ? (
          <p className="text-sm text-muted">
            Cadastre um procedimento antes de encaixar um cliente.
          </p>
        ) : (
          <>
            <SelectField
              label="Procedimento"
              value={form.procedureId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  procedureId: event.target.value,
                }))
              }
            >
              {procedures.map((item) => (
                <option key={item.id} value={item.id}>
                  {BRANCH_LABEL[item.branch]} · {item.name} ·{" "}
                  {minutesToLabel(item.durationMinutes)} · {formatBRL(item.priceCents)}
                </option>
              ))}
            </SelectField>
            <Field
              label="Data e hora"
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              required
            />
            <Field
              label="Nome do cliente"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <Field
              label="CPF"
              value={formatCpf(form.cpf)}
              onChange={(event) =>
                setForm((current) => ({ ...current, cpf: event.target.value }))
              }
              required
            />
            <Field
              label="Telefone"
              value={formatPhone(form.phone)}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            {selected && (
              <p className="text-xs text-muted">
                Duração {minutesToLabel(selected.durationMinutes)} · valor congelado{" "}
                {formatBRL(selected.priceCents)}
              </p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="mt-2">
              Encaixar
            </Button>
          </>
        )}
      </form>
    </Modal>
  );
}
