import { getServiceClient } from "@/shared/lib/supabase/admin";
import { STUDIO } from "@/shared/lib/studio-public";
import type { Branch } from "@/shared/lib/types";
import {
  applySavedProfile,
  canEditPortfolio,
  getTeamProfile,
  publicSlug,
  type TeamProfile,
} from "@/features/public/team-profiles";
import { readManifest } from "@/features/profile/media-store";

export async function loadPublishedProfile(slug: string): Promise<TeamProfile | null> {
  const base = getTeamProfile(slug);
  const admin = getServiceClient();
  if (!admin) return base;

  const profiles = await admin.from("profiles").select("id, name").eq("role", "professional");
  if (profiles.error || !profiles.data) return base;

  const person = profiles.data.find((row) => publicSlug(String(row.name)) === slug);
  if (!person) return base;

  const branchesRes = await admin
    .from("professional_branches")
    .select("branch")
    .eq("professional_id", person.id);
  const branches = (branchesRes.data ?? []).map((row) => row.branch as Branch);
  if (!canEditPortfolio(branches) && !base) return null;

  const saved = await readManifest(String(person.id));
  const shell: TeamProfile = base ?? {
    slug,
    name: String(person.name),
    branches,
    whatsapp: STUDIO.phone,
    blocks: [],
    portfolio: [],
  };

  return {
    ...applySavedProfile(shell, saved),
    name: String(person.name),
    branches: branches.length > 0 ? branches : shell.branches,
  };
}
