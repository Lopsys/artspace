import { NextResponse } from "next/server";
import { onlyDigits } from "@/shared/lib/format";
import { getRequestUser, getServiceClient } from "@/shared/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin || !user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const staff = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (staff.data?.role === "professional") {
    return NextResponse.json(
      { message: "Esta conta é da equipe. Use o login interno." },
      { status: 403 },
    );
  }

  const input = (await request.json()) as {
    name?: string;
    phone?: string;
    cpf?: string;
    email?: string;
  };
  const cpf = onlyDigits(input.cpf ?? "");
  const name = (input.name ?? "").trim();
  const phone = onlyDigits(input.phone ?? "");
  const email = (input.email ?? user.email ?? "").trim().toLowerCase();

  if (!name) {
    return NextResponse.json({ message: "Informe o nome." }, { status: 400 });
  }
  if (cpf.length !== 11) {
    return NextResponse.json({ message: "CPF precisa ter 11 dígitos." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ message: "Informe o e-mail." }, { status: 400 });
  }

  const existingCpf = await admin.from("clients").select("*").eq("cpf", cpf).maybeSingle();
  if (existingCpf.error) {
    return NextResponse.json({ message: existingCpf.error.message }, { status: 400 });
  }

  if (
    existingCpf.data?.auth_user_id &&
    existingCpf.data.auth_user_id !== user.id
  ) {
    return NextResponse.json(
      { message: "Este CPF já tem uma conta. Entre com o e-mail dela." },
      { status: 409 },
    );
  }

  const byAuth = await admin
    .from("clients")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (byAuth.data && byAuth.data.cpf !== cpf) {
    return NextResponse.json(
      { message: "Esta conta já está ligada a outro CPF." },
      { status: 409 },
    );
  }

  const payload = {
    name,
    phone,
    cpf,
    email,
    auth_user_id: user.id,
  };

  if (existingCpf.data) {
    const updated = await admin
      .from("clients")
      .update(payload)
      .eq("id", existingCpf.data.id)
      .select("*")
      .single();
    if (updated.error) {
      return NextResponse.json({ message: updated.error.message }, { status: 400 });
    }
    return NextResponse.json({
      client: {
        id: updated.data.id,
        name: updated.data.name,
        reused: true,
      },
    });
  }

  const created = await admin.from("clients").insert(payload).select("*").single();
  if (created.error) {
    return NextResponse.json({ message: created.error.message }, { status: 400 });
  }
  return NextResponse.json({
    client: { id: created.data.id, name: created.data.name, reused: false },
  });
}

export async function GET(request: Request) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin || !user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const row = await admin
    .from("clients")
    .select("id, name, phone, cpf, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (row.error) {
    return NextResponse.json({ message: row.error.message }, { status: 400 });
  }
  return NextResponse.json({ client: row.data });
}
