"use client";

import { ProcedureManager } from "@/features/procedures/procedure-manager";
import { useStudio } from "@/features/studio/store";

export default function ProceduresPage() {
  const { session } = useStudio();
  if (!session) return null;
  return <ProcedureManager professionalId={session.id} />;
}
