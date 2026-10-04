import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedProfile } from "@/features/profile/load-published";
import { ProfessionalProfile } from "@/features/public/professional-profile";
import { quoteKind, teamProfileSlugs } from "@/features/public/team-profiles";
import type { Branch } from "@/shared/lib/types";

function teamBackHref(ramo: string | undefined, branches: Branch[]) {
  const fromQuery =
    ramo === "tattoo" || ramo === "barber" || ramo === "piercing" ? ramo : null;
  const fallback = quoteKind(branches) ?? branches[0] ?? "tattoo";
  return `/?ramo=${fromQuery ?? fallback}`;
}

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return teamProfileSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublishedProfile(slug);
  if (!profile) return { title: "Equipe · Artspace" };
  return {
    title: `${profile.name} · Artspace`,
    description: profile.blocks[0]?.text,
  };
}

export default async function EquipePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ramo?: string }>;
}) {
  const { slug } = await params;
  const { ramo } = await searchParams;
  const profile = await loadPublishedProfile(slug);
  if (!profile) notFound();
  return (
    <ProfessionalProfile
      profile={profile}
      backHref={teamBackHref(ramo, profile.branches)}
    />
  );
}
