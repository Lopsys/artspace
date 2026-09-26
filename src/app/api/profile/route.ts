import { NextResponse } from "next/server";
import { portraitFor } from "@/features/public/portraits";
import { readManifest, writeManifest } from "@/features/profile/media-store";
import {
  applySavedProfile,
  canEditPortfolio,
  getTeamProfile,
  publicSlug,
  type SavedPublicProfile,
} from "@/features/public/team-profiles";
import { getRequestUser, getServiceClient } from "@/shared/lib/supabase/admin";
import type { Branch } from "@/shared/lib/types";

async function loadOwn(request: Request) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin) {
    return { error: NextResponse.json({ message: "Para salvar o perfil, cole SUPABASE_SERVICE_ROLE_KEY no .env.local." }, { status: 501 }) };
  }
  if (!user) {
    return { error: NextResponse.json({ message: "Sessão expirada." }, { status: 401 }) };
  }

  const [profileRes, branchesRes] = await Promise.all([
    admin.from("profiles").select("id, name").eq("id", user.id).maybeSingle(),
    admin.from("professional_branches").select("branch").eq("professional_id", user.id),
  ]);
  if (!profileRes.data) {
    return { error: NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 }) };
  }

  const branches = (branchesRes.data ?? []).map((row) => row.branch as Branch);
  const name = String(profileRes.data.name);
  const saved = await readManifest(user.id);
  const base = getTeamProfile(publicSlug(name) ?? "");
  const published = base
    ? applySavedProfile(base, saved)
    : { blocks: saved?.blocks ?? [], portfolio: saved?.portfolio ?? [] };

  return {
    admin,
    userId: user.id,
    name,
    branches,
    saved,
    avatarUrl: saved?.avatarUrl || portraitFor(name)?.src || null,
    blocks: published.blocks,
    portfolio: published.portfolio,
    canEditPortfolio: canEditPortfolio(branches),
  };
}

export async function GET(request: Request) {
  const own = await loadOwn(request);
  if ("error" in own && own.error) return own.error;
  if (!("name" in own)) return NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 });
  return NextResponse.json({
    name: own.name,
    branches: own.branches,
    canEditPortfolio: own.canEditPortfolio,
    avatarUrl: own.avatarUrl,
    blocks: own.blocks,
    portfolio: own.portfolio,
  });
}

export async function PUT(request: Request) {
  const own = await loadOwn(request);
  if ("error" in own && own.error) return own.error;
  if (!("userId" in own)) return NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 });

  const input = (await request.json()) as SavedPublicProfile;
  const avatarUrl = input.avatarUrl?.trim() || null;

  if (!own.canEditPortfolio) {
    try {
      await writeManifest(own.userId, { avatarUrl });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.";
      return NextResponse.json({ message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const blocks = (input.blocks ?? []).map((block) => ({
    text: block.text.trim(),
    image: block.image.trim(),
    alt: block.alt?.trim() || "Trabalho",
  }));
  const portfolio = (input.portfolio ?? []).map((item) => ({
    src: item.src.trim(),
    alt: item.alt.trim() || "Trabalho",
  }));

  if (blocks.some((block) => !block.text || !block.image)) {
    return NextResponse.json(
      { message: "Cada texto precisa de uma frase e de uma imagem." },
      { status: 400 },
    );
  }
  if (portfolio.some((item) => !item.src)) {
    return NextResponse.json({ message: "Cada foto do portfólio precisa da imagem." }, { status: 400 });
  }

  try {
    await writeManifest(own.userId, { avatarUrl, blocks, portfolio });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.";
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
