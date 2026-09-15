import { NextResponse } from "next/server";
import { generateSlots, saoPauloDateString, weekStartMonday } from "@/features/studio/rules";
import { createSeedState } from "@/features/studio/seed";
import { getServiceClient } from "@/shared/lib/supabase/admin";
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityBlock,
  AvailabilityRule,
} from "@/shared/lib/types";

function mapAppointments(
  rows: Array<{
    id: string;
    client_id: string;
    professional_id: string;
    procedure_id: string;
    starts_at: string;
    ends_at: string;
    price_cents: number;
    status: string;
  }>,
): Appointment[] {
  return rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    professionalId: row.professional_id,
    procedureId: row.procedure_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    priceCents: row.price_cents,
    status: row.status as AppointmentStatus,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const professionalId = url.searchParams.get("professionalId") ?? "";
  const procedureId = url.searchParams.get("procedureId") ?? "";
  const fromRaw = url.searchParams.get("from") ?? "";
  const requested =
    /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : saoPauloDateString(new Date());
  const fromDate = weekStartMonday(requested);
  if (!professionalId || !procedureId) {
    return NextResponse.json(
      { message: "Escolha procedimento e profissional." },
      { status: 400 },
    );
  }

  const admin = getServiceClient();
  if (!admin) {
    const seed = createSeedState();
    const procedure = seed.procedures.find((item) => item.id === procedureId);
    if (!procedure || procedure.professionalId !== professionalId) {
      return NextResponse.json({ message: "Procedimento inválido." }, { status: 400 });
    }
    return NextResponse.json({
      weekStart: fromDate,
      slots: generateSlots({
        professionalId,
        durationMinutes: procedure.durationMinutes,
        fromDate,
        dayCount: 7,
        rules: seed.availabilityRules,
        blocks: seed.availabilityBlocks,
        appointments: seed.appointments,
      }),
    });
  }

  const procedureRes = await admin
    .from("procedures")
    .select("id, professional_id, duration_minutes, archived")
    .eq("id", procedureId)
    .maybeSingle();
  if (procedureRes.error) {
    return NextResponse.json({ message: procedureRes.error.message }, { status: 500 });
  }
  if (
    !procedureRes.data ||
    procedureRes.data.archived ||
    procedureRes.data.professional_id !== professionalId
  ) {
    return NextResponse.json({ message: "Procedimento inválido." }, { status: 400 });
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
  const error = rulesRes.error ?? blocksRes.error ?? appointmentsRes.error;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rules: AvailabilityRule[] = (rulesRes.data ?? []).map((row) => ({
    id: row.id as string,
    professionalId: row.professional_id as string,
    weekday: row.weekday as number,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    slotMinutes: row.slot_minutes as number,
  }));
  const blocks: AvailabilityBlock[] = (blocksRes.data ?? []).map((row) => ({
    id: row.id as string,
    professionalId: row.professional_id as string,
    date: String(row.date),
    reason: (row.reason as string) ?? "Folga",
  }));

  const slots = generateSlots({
    professionalId,
    durationMinutes: procedureRes.data.duration_minutes as number,
    fromDate,
    dayCount: 7,
    rules,
    blocks,
    appointments: mapAppointments((appointmentsRes.data ?? []) as never),
  });

  return NextResponse.json({ weekStart: fromDate, slots });
}
