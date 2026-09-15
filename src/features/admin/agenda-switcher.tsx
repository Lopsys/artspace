"use client";

import { useMemo, useState } from "react";
import { AgendaView } from "@/features/agenda/agenda-view";
import { useStudio } from "@/features/studio/store";
import { SelectField } from "@/shared/components/ui/input";

export function AgendaSwitcher() {
  const { state } = useStudio();
  const professionals = useMemo(
    () =>
      state.profiles.filter((profile) => profile.role === "professional"),
    [state.profiles],
  );
  const [selected, setSelected] = useState(professionals[0]?.id ?? "");
  const person =
    professionals.find((item) => item.id === selected) ?? professionals[0];

  if (!person) {
    return <p className="text-muted">Nenhum profissional cadastrado.</p>;
  }

  return (
    <div className="grid gap-5">
      <SelectField
        label="Profissional"
        value={person.id}
        onChange={(event) => setSelected(event.target.value)}
      >
        {professionals.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </SelectField>
      <AgendaView
        professionalId={person.id}
        professionalName={person.name}
        adminView
      />
    </div>
  );
}
