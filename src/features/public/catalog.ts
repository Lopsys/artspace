import type { Branch, StudioState } from "@/shared/lib/types";

export type CatalogProfessional = {
  id: string;
  name: string;
  branches: Branch[];
  avatarUrl?: string | null;
};

export type CatalogProcedure = {
  id: string;
  professionalId: string;
  professionalName: string;
  branch: Branch;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type PublicCatalog = {
  professionals: CatalogProfessional[];
  procedures: CatalogProcedure[];
};

export function catalogFromState(state: StudioState): PublicCatalog {
  const professionals = state.profiles
    .filter((profile) => profile.role === "professional")
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      avatarUrl: null,
      branches: state.branches
        .filter((item) => item.professionalId === profile.id)
        .map((item) => item.branch),
    }));

  const names = new Map(professionals.map((item) => [item.id, item.name]));
  const procedures = state.procedures
    .filter((item) => !item.archived)
    .map((item) => ({
      id: item.id,
      professionalId: item.professionalId,
      professionalName: names.get(item.professionalId) ?? "Profissional",
      branch: item.branch,
      name: item.name,
      durationMinutes: item.durationMinutes,
      priceCents: item.priceCents,
    }));

  return { professionals, procedures };
}
