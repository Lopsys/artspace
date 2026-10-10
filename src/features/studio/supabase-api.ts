import { addMinutes, formatISO, parseISO } from "date-fns";
import { mapAvailabilityBlock } from "@/features/studio/rules";
import { PROFESSIONAL_BOOTSTRAP } from "@/features/studio/seed";
import { getSupabase } from "@/shared/lib/supabase/client";
import { onlyDigits } from "@/shared/lib/format";
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  Procedure,
  Profile,
  StudioState,
} from "@/shared/lib/types";

type Result =
  | { ok: true; message?: string; kind?: "professional" | "client" | null }
  | { ok: false; message: string };
type DbRow = Record<string, unknown>;

const CONFIRM_EMAIL_HELP =
  "A conta existe, mas o e-mail não está confirmado. No Supabase: Authentication → Users → abra o usuário → Confirm user. Desligue também Confirm email em Authentication → Providers → Email. Depois entre de novo.";

const CLOCK_HELP =
  "O relógio deste computador está dessincronizado (JWT issued at future). No Windows: Configurações → Hora e idioma → Data e hora → ative 'Definir hora automaticamente' e clique em 'Sincronizar agora'. Depois recarregue e entre de novo.";

function explain(error: { message?: string; code?: string; status?: number } | null) {
  const message = error?.message ?? "Não foi possível salvar; tente de novo.";
  const lower = message.toLowerCase();
  const code = error?.code ?? "";
  if (lower.includes("issued at future") || lower.includes("issued in the future")) {
    return CLOCK_HELP;
  }
  if (
    error?.status === 429 ||
    code.includes("over_") ||
    lower.includes("rate limit")
  ) {
    return "O Auth bloqueou tentativas demais. Espere 15–60 minutos e entre com @artspace.com.br (não use .local).";
  }
  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed")
  ) {
    return CONFIRM_EMAIL_HELP;
  }
  if (lower.includes("user already registered") || code === "user_already_exists") {
    return CONFIRM_EMAIL_HELP;
  }
  if (lower.includes("invalid login") || code === "invalid_credentials") {
    return "E-mail ou senha inválidos.";
  }
  if (lower.includes("invalid") && lower.includes("email")) {
    return "O Supabase recusa e-mail .local. Use @artspace.com.br.";
  }
  if (error?.code === "23P01" || message.includes("appointments_no_overlap")) {
    return "Esse intervalo não está livre.";
  }
  if (error?.code === "PGRST205" || lower.includes("schema cache")) {
    return "Rode supabase/schema.sql no SQL Editor do projeto e recarregue.";
  }
  if (lower.includes("email not confirmed")) {
    return "Desligue Confirm email em Authentication → Providers → Email e entre de novo.";
  }
  return message;
}

function asTime(value: string) {
  return value.slice(0, 5);
}

function emptyState(): StudioState {
  return {
    profiles: [],
    branches: [],
    procedures: [],
    availabilityRules: [],
    availabilityBlocks: [],
    appointments: [],
  };
}

function mapProfessional(row: {
  id: string;
  name: string;
  phone: string | null;
  cpf: string;
  email: string;
  role: Profile["role"];
  is_admin: boolean;
}): Profile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    cpf: row.cpf,
    email: row.email,
    role: row.role,
    isAdmin: row.is_admin,
    password: "",
  };
}

function mapClient(row: {
  id: string;
  name: string;
  phone: string | null;
  cpf: string;
  email: string | null;
}): Profile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    cpf: row.cpf,
    email: row.email ?? "",
    role: "client",
    isAdmin: false,
    password: "",
  };
}

export async function clearStaleAuth() {
  const supabase = getSupabase();
  await supabase.auth.signOut({ scope: "local" });
  if (typeof window === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") || key.includes("supabase")) {
      localStorage.removeItem(key);
    }
  }
}

export async function loadStudio(): Promise<
  Result & { state: StudioState; sessionId: string | null; kind: "professional" | "client" | null }
> {
  const supabase = getSupabase();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (
    sessionError &&
    (sessionError.message ?? "").toLowerCase().includes("issued at future")
  ) {
    await clearStaleAuth();
    return {
      ok: false,
      message: CLOCK_HELP,
      state: emptyState(),
      sessionId: null,
      kind: null,
    };
  }

  const user = session?.user;
  if (!user) {
    return { ok: true, state: emptyState(), sessionId: null, kind: null };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "professional") {
    return { ok: true, state: emptyState(), sessionId: null, kind: "client" };
  }

  const [
    profilesRes,
    branchesRes,
    proceduresRes,
    rulesRes,
    blocksRes,
    clientsRes,
    appointmentsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("professional_branches").select("*"),
    supabase.from("procedures").select("*"),
    supabase.from("availability_rules").select("*"),
    supabase.from("availability_blocks").select("*"),
    supabase.from("clients").select("*"),
    supabase.from("appointments").select("*"),
  ]);

  const firstError =
    profilesRes.error ??
    branchesRes.error ??
    proceduresRes.error ??
    rulesRes.error ??
    blocksRes.error ??
    clientsRes.error ??
    appointmentsRes.error;

  if (
    firstError &&
    (firstError.message ?? "").toLowerCase().includes("issued at future")
  ) {
    await clearStaleAuth();
    return {
      ok: false,
      message: CLOCK_HELP,
      state: emptyState(),
      sessionId: null,
      kind: null,
    };
  }

  if (firstError) {
    return {
      ok: false,
      message: explain(firstError),
      state: emptyState(),
      sessionId: user.id,
      kind: "professional",
    };
  }

  return {
    ok: true,
    sessionId: user.id,
    kind: "professional",
    state: {
      profiles: [
        ...(profilesRes.data ?? []).map(mapProfessional),
        ...(clientsRes.data ?? []).map(mapClient),
      ],
      branches: (branchesRes.data ?? []).map((row: DbRow) => ({
        professionalId: row.professional_id as string,
        branch: row.branch as Branch,
      })),
      procedures: (proceduresRes.data ?? []).map((row: DbRow) => ({
        id: row.id as string,
        professionalId: row.professional_id as string,
        branch: row.branch as Branch,
        name: row.name as string,
        durationMinutes: row.duration_minutes as number,
        priceCents: row.price_cents as number,
        archived: Boolean(row.archived),
      })),
      availabilityRules: (rulesRes.data ?? []).map((row: DbRow) => ({
        id: row.id as string,
        professionalId: row.professional_id as string,
        weekday: row.weekday as number,
        start: asTime(String(row.start_time)),
        end: asTime(String(row.end_time)),
        slotMinutes: row.slot_minutes as number,
      })),
      availabilityBlocks: (blocksRes.data ?? []).map((row: DbRow) =>
        mapAvailabilityBlock({
          id: row.id as string,
          professional_id: row.professional_id as string,
          date: String(row.date),
          reason: (row.reason as string) ?? null,
          start_time: (row.start_time as string) ?? null,
          end_time: (row.end_time as string) ?? null,
        }),
      ),
      appointments: (appointmentsRes.data ?? []).map((row: DbRow) => ({
        id: row.id as string,
        clientId: row.client_id as string,
        professionalId: row.professional_id as string,
        procedureId: row.procedure_id as string,
        startsAt: new Date(row.starts_at as string).toISOString(),
        endsAt: new Date(row.ends_at as string).toISOString(),
        priceCents: row.price_cents as number,
        status: row.status as Appointment["status"],
      })),
    },
  };
}

async function ensureProfessionalProfile(userId: string, email: string) {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  const seed = PROFESSIONAL_BOOTSTRAP[email.toLowerCase()];
  if (!seed) return;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    name: seed.name,
    phone: seed.phone,
    cpf: seed.cpf,
    email: email.toLowerCase(),
    role: "professional",
    is_admin: seed.isAdmin,
  });
  if (profileError) throw profileError;

  if (seed.branches.length) {
    const { error } = await supabase.from("professional_branches").insert(
      seed.branches.map((branch) => ({
        professional_id: userId,
        branch,
      })),
    );
    if (error) throw error;
  }

  const { error: rulesError } = await supabase.from("availability_rules").insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      professional_id: userId,
      weekday,
      start_time: "09:00",
      end_time: "19:00",
      slot_minutes: 30,
    })),
  );
  if (rulesError) throw rulesError;

  if (seed.procedures.length) {
    const { error } = await supabase.from("procedures").insert(
      seed.procedures.map((item) => ({
        professional_id: userId,
        branch: item.branch,
        name: item.name,
        duration_minutes: item.durationMinutes,
        price_cents: item.priceCents,
      })),
    );
    if (error) throw error;
  }
}

export async function signInProfessional(
  email: string,
  password: string,
): Promise<Result> {
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  if (normalized.endsWith(".local")) {
    return {
      ok: false,
      message: "O Supabase recusa e-mail .local. Use @artspace.com.br.",
    };
  }

  await clearStaleAuth();

  const attempt = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  let userId = attempt.data.user?.id;
  const failed = attempt.error || !userId;
  const lower = (attempt.error?.message ?? "").toLowerCase();
  const rateLimited =
    attempt.error?.status === 429 ||
    (attempt.error?.code ?? "").includes("over_") ||
    lower.includes("rate limit");
  const unknownUser =
    attempt.error?.code === "invalid_credentials" ||
    lower.includes("invalid login");
  const needsConfirm =
    attempt.error?.code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed");

  if (failed && rateLimited) {
    return { ok: false, message: explain(attempt.error) };
  }

  if (failed && needsConfirm) {
    return { ok: false, message: CONFIRM_EMAIL_HELP };
  }

  if (failed && unknownUser && PROFESSIONAL_BOOTSTRAP[normalized]) {
    const created = await supabase.auth.signUp({
      email: normalized,
      password,
    });
    if (created.error) {
      return { ok: false, message: explain(created.error) };
    }
    if (!created.data.session || !created.data.user) {
      return { ok: false, message: CONFIRM_EMAIL_HELP };
    }
    userId = created.data.user.id;
  } else if (failed) {
    return { ok: false, message: explain(attempt.error) };
  }

  if (!userId) {
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  try {
    await ensureProfessionalProfile(userId, normalized);
  } catch (error) {
    return {
      ok: false,
      message: explain(error as { message?: string }),
    };
  }

  const { data: profile } = await getSupabase()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "professional") {
    return { ok: true, kind: "professional" };
  }
  return { ok: true, kind: "client" };
}

export async function signOutProfessional() {
  await getSupabase().auth.signOut();
}

export async function upsertClientRow(input: {
  name: string;
  phone: string;
  cpf: string;
  email: string;
}): Promise<{ profile: Profile; reused: boolean } | { error: string }> {
  const cpf = onlyDigits(input.cpf);
  if (cpf.length !== 11) return { error: "CPF precisa ter 11 dígitos." };
  if (!input.name.trim()) return { error: "Informe o nome do cliente." };

  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("*")
    .eq("cpf", cpf)
    .maybeSingle();
  if (findError) return { error: explain(findError) };
  if (existing) return { profile: mapClient(existing), reused: true };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name.trim(),
      phone: onlyDigits(input.phone),
      cpf,
      email: input.email.trim().toLowerCase() || null,
    })
    .select("*")
    .single();
  if (error || !data) return { error: explain(error) };
  return { profile: mapClient(data), reused: false };
}

export async function insertAppointment(input: {
  professionalId: string;
  clientId: string;
  procedureId: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
}): Promise<Result> {
  const { error } = await getSupabase().from("appointments").insert({
    professional_id: input.professionalId,
    client_id: input.clientId,
    procedure_id: input.procedureId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    price_cents: input.priceCents,
    status: "scheduled",
  });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<Result> {
  const { error } = await getSupabase()
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);
  if (error) return { ok: false, message: explain(error) };
  return { ok: true };
}

export async function deleteAppointment(
  appointmentId: string,
): Promise<Result> {
  const { error } = await getSupabase()
    .from("appointments")
    .delete()
    .eq("id", appointmentId);
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, message: "Horário excluído." };
}

export async function insertReschedule(input: {
  oldId: string;
  professionalId: string;
  clientId: string;
  procedureId: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
}): Promise<Result> {
  const supabase = getSupabase();
  const moved = await supabase
    .from("appointments")
    .update({ status: "rescheduled" })
    .eq("id", input.oldId);
  if (moved.error) return { ok: false, message: explain(moved.error) };

  const created = await supabase.from("appointments").insert({
    professional_id: input.professionalId,
    client_id: input.clientId,
    procedure_id: input.procedureId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    price_cents: input.priceCents,
    status: "scheduled",
  });
  if (created.error) {
    await supabase
      .from("appointments")
      .update({ status: "scheduled" })
      .eq("id", input.oldId);
    return { ok: false, message: explain(created.error) };
  }
  return { ok: true, message: "Horário remarcado." };
}

export async function upsertProcedure(
  input: Omit<Procedure, "archived">,
): Promise<Result> {
  const supabase = getSupabase();
  const payload = {
    professional_id: input.professionalId,
    branch: input.branch,
    name: input.name.trim(),
    duration_minutes: input.durationMinutes,
    price_cents: input.priceCents,
  };
  const result = input.id
    ? await supabase.from("procedures").update(payload).eq("id", input.id)
    : await supabase.from("procedures").insert(payload);
  if (result.error) return { ok: false, message: explain(result.error) };
  return { ok: true, message: "Procedimento salvo." };
}

export async function archiveOrDeleteProcedure(
  procedureId: string,
  archive: boolean,
): Promise<Result> {
  const supabase = getSupabase();
  if (archive) {
    const { error } = await supabase
      .from("procedures")
      .update({ archived: true })
      .eq("id", procedureId);
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: "Há horários futuros — procedimento arquivado." };
  }
  const { error } = await supabase.from("procedures").delete().eq("id", procedureId);
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, message: "Procedimento removido." };
}

export async function upsertAvailabilityRule(input: {
  professionalId: string;
  weekday: number;
  start: string;
  end: string;
  slotMinutes: number;
}): Promise<Result> {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("availability_rules")
    .select("id")
    .eq("professional_id", input.professionalId)
    .eq("weekday", input.weekday)
    .maybeSingle();

  const payload = {
    professional_id: input.professionalId,
    weekday: input.weekday,
    start_time: input.start,
    end_time: input.end,
    slot_minutes: input.slotMinutes,
  };

  const result = existing
    ? await supabase.from("availability_rules").update(payload).eq("id", existing.id)
    : await supabase.from("availability_rules").insert(payload);

  if (result.error) return { ok: false, message: explain(result.error) };
  return { ok: true, message: "Grade atualizada." };
}

export async function toggleAvailabilityBlock(
  professionalId: string,
  date: string,
  reason = "Folga",
): Promise<Result> {
  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from("availability_blocks")
    .select("id, reason, start_time, end_time")
    .eq("professional_id", professionalId)
    .eq("date", date);

  if (readError) return { ok: false, message: explain(readError) };

  const fullDayIds = (existing ?? [])
    .filter((row: { reason?: string | null; start_time?: string | null; end_time?: string | null }) => {
      const text = String(row.reason ?? "");
      const timed = /(\d{2}:\d{2})-(\d{2}:\d{2})/.test(text) || Boolean(row.start_time && row.end_time);
      return !timed;
    })
    .map((row: { id: string }) => row.id);

  if (fullDayIds.length) {
    const { error } = await supabase.from("availability_blocks").delete().in("id", fullDayIds);
    if (error) return { ok: false, message: explain(error) };
    return { ok: true };
  }

  const { error } = await supabase.from("availability_blocks").insert({
    professional_id: professionalId,
    date,
    reason,
  });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true };
}

export async function createProfessionalRemote(input: {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
  branches: Branch[];
  isAdmin?: boolean;
}): Promise<Result> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch("/api/professionals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? "Não foi possível criar o profissional.",
    };
  }
  return { ok: true, message: "Profissional criado." };
}

export function appointmentWindow(startsAt: string, durationMinutes: number) {
  const start = parseISO(startsAt);
  const end = addMinutes(start, durationMinutes);
  return {
    date: formatISO(start, { representation: "date" }),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    start,
    end,
  };
}
