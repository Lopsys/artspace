"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, SelectField } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { useStudio } from "@/features/studio/store";
import { formatBRL, minutesToLabel } from "@/shared/lib/format";
import { BRANCH_LABEL, type Branch, type Procedure } from "@/shared/lib/types";

export function ProcedureManager({ professionalId }: { professionalId: string }) {
  const { state, branchesOf, saveProcedure, archiveProcedure } = useStudio();
  const branches = branchesOf(professionalId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    branch: branches[0] ?? ("barber" as Branch),
    durationMinutes: 45,
    price: "80",
  });

  const list = state.procedures.filter(
    (item) => item.professionalId === professionalId && !item.archived,
  );

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      branch: branches[0] ?? "barber",
      durationMinutes: 45,
      price: "80",
    });
    setError("");
    setOpen(true);
  }

  function openEdit(item: Procedure) {
    setEditing(item);
    setForm({
      name: item.name,
      branch: item.branch,
      durationMinutes: item.durationMinutes,
      price: String(item.priceCents / 100),
    });
    setError("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const priceCents = Math.round(Number(form.price.replace(",", ".")) * 100);
    const result = await saveProcedure({
      id: editing?.id,
      professionalId,
      name: form.name,
      branch: form.branch,
      durationMinutes: Number(form.durationMinutes),
      priceCents,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.25em] text-gold">CATÁLOGO</p>
          <h1 className="font-serif text-3xl tracking-wide">Procedimentos</h1>
        </div>
        <Button onClick={openCreate} disabled={branches.length === 0}>
          Novo procedimento
        </Button>
      </div>

      {branches.map((branch) => {
        const items = list.filter((item) => item.branch === branch);
        return (
          <div key={branch} className="grid gap-3">
            <h2 className="text-sm tracking-[0.2em] text-gold">
              {BRANCH_LABEL[branch].toUpperCase()}
            </h2>
            {items.length === 0 && (
              <p className="rounded-3xl border border-dashed border-line px-4 py-8 text-sm text-muted">
                Nenhum procedimento de {BRANCH_LABEL[branch].toLowerCase()} ainda.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-line bg-ink-soft p-4"
                >
                  <p className="font-medium text-cream">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {minutesToLabel(item.durationMinutes)} · {formatBRL(item.priceCents)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="line" onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => void archiveProcedure(item.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}

      {open && (
        <Modal
          title={editing ? "Editar procedimento" : "Novo procedimento"}
          onClose={() => setOpen(false)}
        >
          <form className="grid gap-3" onSubmit={submit}>
            <Field
              label="Nome"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <SelectField
              label="Ramo"
              value={form.branch}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  branch: event.target.value as Branch,
                }))
              }
            >
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {BRANCH_LABEL[branch]}
                </option>
              ))}
            </SelectField>
            <Field
              label="Duração (minutos)"
              type="number"
              min={5}
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  durationMinutes: Number(event.target.value),
                }))
              }
              required
            />
            <Field
              label="Valor (R$)"
              inputMode="decimal"
              value={form.price}
              onChange={(event) =>
                setForm((current) => ({ ...current, price: event.target.value }))
              }
              required
            />
            <p className="text-xs text-muted">
              Editar o preço não altera horários já encaixados.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit">Salvar</Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
