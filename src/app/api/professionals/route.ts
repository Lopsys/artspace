import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { onlyDigits } from "@/shared/lib/format";
import { proceduresForBranches } from "@/features/studio/seed";
import type { Branch } from "@/shared/lib/types";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/shared/lib/supabase/env";

export async function POST(request: Request) {
  const url = getSupabaseUrl();
  const publishable = getSupabasePublishableKey();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishable) {
    return NextResponse.json(
      { message: "Supabase não configurado." },
      { status: 500 },
    );
  }
  if (!service) {
    return NextResponse.json(
      {
        message:
          "Para criar login pelo admin, cole SUPABASE_SERVICE_ROLE_KEY no .env.local (Dashboard → Settings → API → secret).",
      },
      { status: 501 },
    );
  }

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const asUser = createClient(url, publishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await asUser.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { data: admin } = await asUser
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!admin?.is_admin) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const input = (await request.json()) as {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    branches: string[];
    isAdmin?: boolean;
  };

  const cpf = onlyDigits(input.cpf);
  if (!input.name?.trim() || !input.email?.trim()) {
    return NextResponse.json(
      { message: "Nome e e-mail são obrigatórios." },
      { status: 400 },
    );
  }
  if (!input.branches?.length) {
    return NextResponse.json(
      { message: "Escolha ao menos um ramo." },
      { status: 400 },
    );
  }
  if (cpf.length !== 11) {
    return NextResponse.json(
      { message: "CPF precisa ter 11 dígitos." },
      { status: 400 },
    );
  }

  const adminClient = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created = await adminClient.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password || "artspace123",
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    return NextResponse.json(
      { message: created.error?.message ?? "Falha ao criar usuário." },
      { status: 400 },
    );
  }

  const userId = created.data.user.id;
  const profile = await adminClient.from("profiles").insert({
    id: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: onlyDigits(input.phone),
    cpf,
    role: "professional",
    is_admin: Boolean(input.isAdmin),
  });
  if (profile.error) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json({ message: profile.error.message }, { status: 400 });
  }

  await adminClient.from("professional_branches").insert(
    input.branches.map((branch) => ({
      professional_id: userId,
      branch,
    })),
  );
  await adminClient.from("availability_rules").insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      professional_id: userId,
      weekday,
      start_time: "09:00",
      end_time: "19:00",
      slot_minutes: 30,
    })),
  );
  const catalog = proceduresForBranches(input.branches as Branch[]);
  if (catalog.length) {
    await adminClient.from("procedures").insert(
      catalog.map((item) => ({
        professional_id: userId,
        branch: item.branch,
        name: item.name,
        duration_minutes: item.durationMinutes,
        price_cents: item.priceCents,
      })),
    );
  }

  return NextResponse.json({ ok: true });
}
