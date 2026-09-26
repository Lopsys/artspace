import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedProfile } from "@/features/profile/load-published";
import { ProfessionalProfile } from "@/features/public/professional-profile";
import { teamProfileSlugs } from "@/features/public/team-profiles";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await loadPublishedProfile(slug);
  if (!profile) notFound();
  return <ProfessionalProfile profile={profile} />;
}
