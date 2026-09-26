import { NextResponse } from "next/server";
import { catalogFromState } from "@/features/public/catalog";
import { createSeedState } from "@/features/studio/seed";
import { syncSharedProcedures } from "@/features/studio/sync-procedures";
import { readAvatars } from "@/features/profile/media-store";
import { getServiceClient } from "@/shared/lib/supabase/admin";
import type { Branch } from "@/shared/lib/types";

export async function GET() {
  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json(catalogFromState(createSeedState()));
  }

  await syncSharedProcedures(admin);

  const [profilesRes, branchesRes, proceduresRes] = await Promise.all([
    admin.from("profiles").select("id, name, role").eq("role", "professional"),
    admin.from("professional_branches").select("professional_id, branch"),
    admin.from("procedures").select("*").eq("archived", false),
  ]);

  const error = profilesRes.error ?? branchesRes.error ?? proceduresRes.error;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const professionals = (profilesRes.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    branches: (branchesRes.data ?? [])
      .filter((item) => item.professional_id === row.id)
      .map((item) => item.branch as Branch),
  }));

  const avatars = await readAvatars(professionals.map((person) => person.id));
  const withAvatars = professionals.map((person) => ({
    ...person,
    avatarUrl: avatars.get(person.id) ?? null,
  }));

  const names = new Map(withAvatars.map((item) => [item.id, item.name]));
  const procedures = (proceduresRes.data ?? []).map((row) => ({
    id: row.id as string,
    professionalId: row.professional_id as string,
    professionalName: names.get(row.professional_id as string) ?? "Profissional",
    branch: row.branch as Branch,
    name: row.name as string,
    durationMinutes: row.duration_minutes as number,
    priceCents: row.price_cents as number,
  }));

  return NextResponse.json({ professionals: withAvatars, procedures });
}
