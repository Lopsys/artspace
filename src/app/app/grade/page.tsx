"use client";

import { GradeEditor } from "@/features/availability/grade-editor";
import { useStudio } from "@/features/studio/store";

export default function GradePage() {
  const { session } = useStudio();
  if (!session) return null;
  return <GradeEditor professionalId={session.id} />;
}
