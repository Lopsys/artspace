import { getSupabase } from "@/shared/lib/supabase/client";
import type { PublicCatalog } from "@/features/public/catalog";
import { isSupabaseConfigured } from "@/shared/lib/supabase/env";

type Result = { ok: true; message?: string } | { ok: false; message: string };

async function authHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message ?? "Não foi possível concluir. Tente de novo.";
}

export async function fetchCatalog(): Promise<PublicCatalog> {
  const response = await fetch("/api/public/catalog");
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<PublicCatalog>;
}

export async function fetchSlots(
  professionalId: string,
  procedureId: string,
  fromDate: string,
) {
  const params = new URLSearchParams({ professionalId, procedureId, from: fromDate });
  const response = await fetch(`/api/public/slots?${params.toString()}`);
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as {
    weekStart?: string;
    slots: { startsAt: string; endsAt: string }[];
  };
  return payload.slots;
}

export async function saveClientAccount(input: {
  name: string;
  phone: string;
  cpf: string;
  email: string;
}): Promise<Result> {
  const response = await fetch("/api/public/account", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true };
}

export async function fetchClientAccount() {
  const response = await fetch("/api/public/account", {
    headers: await authHeaders(),
  });
  if (response.status === 401) return { client: null };
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{
    client: { id: string; name: string; phone: string; cpf: string; email: string } | null;
  }>;
}

export async function bookSlot(input: {
  procedureId: string;
  startsAt: string;
  name: string;
  phone: string;
  cpf: string;
}): Promise<Result> {
  const response = await fetch("/api/public/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, message: "Horário reservado." };
}

export async function fetchMyAppointments() {
  const response = await fetch("/api/public/appointments", {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{
    clientName?: string;
    appointments: Array<{
      id: string;
      startsAt: string;
      endsAt: string;
      priceCents: number;
      status: string;
      procedureName: string;
      professionalName: string;
    }>;
  }>;
}

export async function cancelMyAppointment(id: string): Promise<Result> {
  const response = await fetch(`/api/public/appointments/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, message: "Horário cancelado." };
}
