export type Portrait = {
  src: string;
  position?: string;
};

const PORTRAITS: Record<string, Portrait> = {
  maycom: { src: "/team/maycom.jpg", position: "70% 14%" },
  "maycom michel": { src: "/team/maycom.jpg", position: "70% 14%" },
  jhonatas: { src: "/team/jhonatas.jpg", position: "50% 42%" },
  "jhonatas alves": { src: "/team/jhonatas.jpg", position: "50% 42%" },
  larisse: { src: "/team/larisse.jpg", position: "42% 28%" },
  "larisse ribeiro": { src: "/team/larisse.jpg", position: "42% 28%" },
};

export function slugName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const TEAM_LANDING_ORDER = ["maycom", "jhonatas", "larisse", "jonh", "lucas"];

export function sortTeamForLanding<T extends { name: string }>(people: T[]) {
  return [...people].sort((left, right) => {
    const rank = (name: string) => {
      const key = slugName(name).split(" ")[0] ?? name;
      const index = TEAM_LANDING_ORDER.indexOf(key);
      return index === -1 ? TEAM_LANDING_ORDER.length : index;
    };
    return rank(left.name) - rank(right.name);
  });
}

export function portraitFor(name: string, avatarUrl?: string | null): Portrait | null {
  if (avatarUrl) return { src: avatarUrl };
  const key = slugName(name);
  if (PORTRAITS[key]) return PORTRAITS[key];
  const first = key.split(" ")[0];
  return PORTRAITS[first] ?? null;
}
