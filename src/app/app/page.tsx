"use client";

import { AgendaView } from "@/features/agenda/agenda-view";
import { useStudio } from "@/features/studio/store";

export default function AgendaPage() {
  const { session } = useStudio();
  if (!session) return null;
  return (
    <AgendaView
      professionalId={session.id}
      professionalName={session.name}
    />
  );
}
