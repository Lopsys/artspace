import { NextResponse } from "next/server";
import { getRequestUser, getServiceClient } from "@/shared/lib/supabase/admin";

export async function GET(request: Request) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin || !user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const clientRes = await admin
    .from("clients")
    .select("id, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!clientRes.data) {
    return NextResponse.json({ appointments: [] });
  }

  const rows = await admin
    .from("appointments")
    .select("*")
    .eq("client_id", clientRes.data.id)
    .order("starts_at", { ascending: true });
  if (rows.error) {
    return NextResponse.json({ message: rows.error.message }, { status: 400 });
  }

  const procedureIds = [...new Set((rows.data ?? []).map((row) => row.procedure_id as string))];
  const professionalIds = [
    ...new Set((rows.data ?? []).map((row) => row.professional_id as string)),
  ];
  const [proceduresRes, profilesRes] = await Promise.all([
    procedureIds.length
      ? admin.from("procedures").select("id, name").in("id", procedureIds)
      : Promise.resolve({ data: [], error: null }),
    professionalIds.length
      ? admin.from("profiles").select("id, name").in("id", professionalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const procedureName = new Map(
    (proceduresRes.data ?? []).map((row) => [row.id as string, row.name as string]),
  );
  const professionalName = new Map(
    (profilesRes.data ?? []).map((row) => [row.id as string, row.name as string]),
  );

  return NextResponse.json({
    clientName: clientRes.data.name,
    appointments: (rows.data ?? []).map((row) => ({
      id: row.id as string,
      startsAt: new Date(row.starts_at as string).toISOString(),
      endsAt: new Date(row.ends_at as string).toISOString(),
      priceCents: row.price_cents as number,
      status: row.status as string,
      procedureName: procedureName.get(row.procedure_id as string) ?? "Procedimento",
      professionalName: professionalName.get(row.professional_id as string) ?? "Profissional",
    })),
  });
}
