"use client";

import { ProfileEditor } from "@/features/profile/profile-editor";
import { useStudio } from "@/features/studio/store";

export default function ProfilePage() {
  const { session } = useStudio();
  if (!session) return null;
  return <ProfileEditor />;
}
