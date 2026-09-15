"use client";

import { useMemo } from "react";
import { useStudio } from "@/features/studio/store";
import { formatCpf, formatPhone } from "@/shared/lib/format";

export function ClientList({
  professionalId,
  all,
}: {
  professionalId?: string;
  all?: boolean;
}) {
  const { state } = useStudio();

  const clients = useMemo(() => {
    const allowed = new Set(
      all
        ? state.appointments.map((item) => item.clientId)
        : state.appointments
            .filter((item) => item.professionalId === professionalId)
            .map((item) => item.clientId),
    );

    return state.profiles
      .filter((profile) => profile.role === "client" && allowed.has(profile.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all, professionalId, state.appointments, state.profiles]);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs tracking-[0.25em] text-gold">PESSOAS</p>
        <h1 className="font-serif text-3xl tracking-wide">Clientes</h1>
      </div>
      {clients.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-10 text-sm text-muted">
          Nenhum cliente ainda. Eles aparecem depois do primeiro encaixe.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-line">
                  <td className="px-4 py-3">{client.name}</td>
                  <td className="px-4 py-3 text-muted">{formatCpf(client.cpf)}</td>
                  <td className="px-4 py-3 text-muted">
                    {client.phone ? formatPhone(client.phone) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{client.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
