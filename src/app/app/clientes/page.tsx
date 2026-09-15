"use client";

import { ClientList } from "@/features/clients/client-list";
import { useStudio } from "@/features/studio/store";

export default function ClientsPage() {
  const { session } = useStudio();
  if (!session) return null;
  return <ClientList professionalId={session.id} />;
}
