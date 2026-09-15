"use client";

import { useState, type FormEvent } from "react";
import { useStudio } from "@/features/studio/store";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { BRANCH_LABEL, type Branch } from "@/shared/lib/types";

const ALL_BRANCHES: Branch[] = ["tattoo", "barber", "piercing"];

export function ProfessionalManager() {
  const { state, branchesOf, createProfessional } = useStudio();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "artspace123",
    branches: [] as Branch[],
    isAdmin: false,
  });

  const professionals = state.profiles.filter(
    (profile) => profile.role === "professional",
  );

  function toggleBranch(branch: Branch) {
    setForm((current) => ({
      ...current,
      branches: current.branches.includes(branch)
        ? current.branches.filter((item) => item !== branch)
        : [...current.branches, branch],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await createProfessional(form);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      cpf: "",
      password: "artspace123",
      branches: [],
      isAdmin: false,
    });
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-gold">EQUIPE</p>
          <h1 className="font-serif text-3xl tracking-wide">Profissionais</h1>
        </div>
        <Button onClick={() => setOpen(true)}>Novo profissional</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {professionals.map((person) => (
          <article
            key={person.id}
            className="rounded-3xl border border-line bg-ink-soft p-4"
          >
            <p className="font-medium">{person.name}</p>
            <p className="text-sm text-muted">{person.email}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-gold">
              {branchesOf(person.id)
                .map((branch) => BRANCH_LABEL[branch])
                .join(" · ")}
              {person.isAdmin ? " · Admin" : ""}
            </p>
          </article>
        ))}
      </div>

      {open && (
        <Modal title="Novo profissional" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={submit}>
            <Field
              label="Nome"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <Field
              label="Telefone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Field
              label="CPF"
              value={form.cpf}
              onChange={(event) =>
                setForm((current) => ({ ...current, cpf: event.target.value }))
              }
              required
            />
            <Field
              label="Senha inicial"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
            <div className="grid gap-2 text-sm">
              <span className="text-muted">Ramos</span>
              <div className="flex flex-wrap gap-2">
                {ALL_BRANCHES.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranch(branch)}
                    className={`rounded-full border px-3 py-1 ${
                      form.branches.includes(branch)
                        ? "border-gold bg-gold/15 text-gold-bright"
                        : "border-line text-muted"
                    }`}
                  >
                    {BRANCH_LABEL[branch]}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.isAdmin}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isAdmin: event.target.checked,
                  }))
                }
              />
              Também é admin
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit">Criar</Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
