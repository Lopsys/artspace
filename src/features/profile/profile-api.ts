import { getSupabase } from "@/shared/lib/supabase/client";
import { isSupabaseConfigured } from "@/shared/lib/supabase/env";
import type { Branch } from "@/shared/lib/types";
import type { ProfileBlock, SavedPortfolioItem } from "@/features/public/team-profiles";

export type EditableProfile = {
  name: string;
  branches: Branch[];
  canEditPortfolio: boolean;
  avatarUrl: string | null;
  blocks: ProfileBlock[];
  portfolio: SavedPortfolioItem[];
};

async function authHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message ?? "Não foi possível salvar o perfil.";
}

export async function fetchEditableProfile(): Promise<EditableProfile> {
  const response = await fetch("/api/profile", { headers: await authHeaders() });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<EditableProfile>;
}

export async function saveEditableProfile(input: {
  avatarUrl: string | null;
  blocks: ProfileBlock[];
  portfolio: SavedPortfolioItem[];
}) {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function uploadProfilePhoto(file: File) {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/profile/image", {
    method: "POST",
    headers: await authHeaders(),
    body,
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { url: string };
  return payload.url;
}
