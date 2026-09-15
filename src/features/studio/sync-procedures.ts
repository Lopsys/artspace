import type { SupabaseClient } from "@supabase/supabase-js";
import { proceduresForBranches } from "@/features/studio/seed";
import type { Branch } from "@/shared/lib/types";

export async function syncSharedProcedures(client: SupabaseClient) {
  const [branchesRes, existingRes] = await Promise.all([
    client.from("professional_branches").select("professional_id, branch"),
    client.from("procedures").select("professional_id, branch, name"),
  ]);
  if (branchesRes.error || existingRes.error) return;

  const have = new Set(
    (existingRes.data ?? []).map(
      (row) => `${row.professional_id}|${row.branch}|${row.name}`,
    ),
  );
  const byProfessional = new Map<string, Branch[]>();
  for (const row of branchesRes.data ?? []) {
    const list = byProfessional.get(row.professional_id as string) ?? [];
    list.push(row.branch as Branch);
    byProfessional.set(row.professional_id as string, list);
  }

  const missing: {
    professional_id: string;
    branch: Branch;
    name: string;
    duration_minutes: number;
    price_cents: number;
  }[] = [];

  for (const [professionalId, branches] of byProfessional) {
    for (const item of proceduresForBranches(branches)) {
      const key = `${professionalId}|${item.branch}|${item.name}`;
      if (!have.has(key)) {
        missing.push({
          professional_id: professionalId,
          branch: item.branch,
          name: item.name,
          duration_minutes: item.durationMinutes,
          price_cents: item.priceCents,
        });
      }
    }
  }

  if (missing.length === 0) return;
  await client.from("procedures").insert(missing);
}
