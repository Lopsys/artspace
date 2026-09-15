import { NextResponse } from "next/server";
import { findOverlap, generateSlots, saoPauloDateString, weekStartMonday } from "@/features/studio/rules";
import { onlyDigits } from "@/shared/lib/format";
import { getServiceClient } from "@/shared/lib/supabase/admin";
import type { Appointment, AppointmentStatus, AvailabilityRule } from "@/shared/lib/types";

export async function POST(request: Request) {
  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Para agendar, cole SUPABASE_SERVICE_ROLE_KEY no .env.local." },
      { status: 501 },
    );
  }

  const input = (await request.json()) as {
    procedureId?: string;
    startsAt?: string;
    name?: string;
    phone?: string;
    cpf?: string;
  };
  if (!input.procedureId || !input.startsAt) {
    return NextResponse.json(
      { message: "Escolha o procedimento e o horário." },
      { status: 400 },
    );
  }

  const name = (input.name ?? "").trim();
  const phone = onlyDigits(input.phone ?? "");
  const cpf = onlyDigits(input.cpf ?? "");
  if (!name) {
    return NextResponse.json({ message: "Informe o nome." }, { status: 400 });
  }
  if (cpf.length !== 11) {
    return NextResponse.json({ message: "CPF precisa ter 11 dígitos." }, { status: 400 });
  }
  if (phone.length < 10) {
    return NextResponse.json({ message: "Informe o telefone." }, { status: 400 });
  }

  const existing = await admin.from("clients").select("id").eq("cpf", cpf).maybeSingle();
  if (existing.error) {
    return NextResponse.json({ message: existing.error.message }, { status: 400 });
  }

  let clientId = existing.data?.id as string | undefined;
  if (clientId) {
    const updated = await admin
      .from("clients")
      .update({ name, phone })
      .eq("id", clientId);
    if (updated.error) {
      return NextResponse.json({ message: updated.error.message }, { status: 400 });
    }
  } else {
    const created = await admin
      .from("clients")
      .insert({ name, phone, cpf, email: null })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json(
        { message: created.error?.message ?? "Não foi possível salvar o cliente." },
        { status: 400 },
      );
    }
    clientId = created.data.id as string;
  }

  const procedureRes = await admin
    .from("procedures")
    .select("*")
    .eq("id", input.procedureId)
    .maybeSingle();
  if (!procedureRes.data || procedureRes.data.archived) {
    return NextResponse.json({ message: "Procedimento inválido." }, { status: 400 });
  }

  const professionalId = procedureRes.data.professional_id as string;
  const durationMinutes = procedureRes.data.duration_minutes as number;
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime()) || start <= new Date()) {
    return NextResponse.json({ message: "Horário inválido." }, { status: 400 });
  }

  const [rulesRes, blocksRes, appointmentsRes] = await Promise.all([
    admin.from("availability_rules").select("*").eq("professional_id", professionalId),
    admin.from("availability_blocks").select("*").eq("professional_id", professionalId),
    admin
      .from("appointments")
      .select("*")
      .eq("professional_id", professionalId)
      .in("status", ["scheduled", "confirmed", "present"]),
  ]);

  const rules: AvailabilityRule[] = (rulesRes.data ?? []).map((row) => ({
    id: row.id as string,
    professionalId: row.professional_id as string,
    weekday: row.weekday as number,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    slotMinutes: row.slot_minutes as number,
  }));
  const appointments: Appointment[] = (appointmentsRes.data ?? []).map((row) => ({
    id: row.id as string,
    clientId: row.client_id as string,
    professionalId: row.professional_id as string,
    procedureId: row.procedure_id as string,
    startsAt: new Date(row.starts_at as string).toISOString(),
    endsAt: new Date(row.ends_at as string).toISOString(),
    priceCents: row.price_cents as number,
    status: row.status as AppointmentStatus,
  }));

  const offered = generateSlots({
    professionalId,
    durationMinutes,
    fromDate: weekStartMonday(saoPauloDateString(start)),
    dayCount: 7,
    rules,
    blocks: (blocksRes.data ?? []).map((row) => ({
      id: row.id as string,
      professionalId: row.professional_id as string,
      date: String(row.date),
      reason: (row.reason as string) ?? "Folga",
    })),
    appointments,
  });

  const match = offered.find((item) => item.startsAt === start.toISOString());
  if (!match) {
    return NextResponse.json(
      { message: "Esse intervalo não está livre." },
      { status: 409 },
    );
  }

  const overlap = findOverlap(
    appointments,
    professionalId,
    new Date(match.startsAt),
    new Date(match.endsAt),
  );
  if (overlap) {
    return NextResponse.json(
      { message: "Esse intervalo não está livre." },
      { status: 409 },
    );
  }

  const inserted = await admin.from("appointments").insert({
    client_id: clientId,
    professional_id: professionalId,
    procedure_id: input.procedureId,
    starts_at: match.startsAt,
    ends_at: match.endsAt,
    price_cents: procedureRes.data.price_cents,
    status: "scheduled",
  }).select("id").single();

  if (inserted.error) {
    const message = inserted.error.message.includes("appointments_no_overlap")
      ? "Esse intervalo não está livre."
      : inserted.error.message;
    return NextResponse.json({ message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: inserted.data.id });
}
