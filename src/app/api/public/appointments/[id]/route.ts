import { NextResponse } from "next/server";
import { getRequestUser, getServiceClient } from "@/shared/lib/supabase/admin";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin || !user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await context.params;
  const clientRes = await admin
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!clientRes.data) {
    return NextResponse.json({ message: "Atendimento não encontrado." }, { status: 404 });
  }

  const current = await admin
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("client_id", clientRes.data.id)
    .maybeSingle();
  if (!current.data) {
    return NextResponse.json({ message: "Atendimento não encontrado." }, { status: 404 });
  }

  const status = current.data.status as string;
  const startsAt = new Date(current.data.starts_at as string);
  if (
    (status !== "scheduled" && status !== "confirmed") ||
    startsAt <= new Date()
  ) {
    return NextResponse.json(
      { message: "Só é possível cancelar um horário futuro ainda aberto." },
      { status: 400 },
    );
  }

  const removed = await admin.from("appointments").delete().eq("id", id);
  if (removed.error) {
    return NextResponse.json({ message: removed.error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
