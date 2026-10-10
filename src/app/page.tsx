import type { Metadata } from "next";
import { LandingPage } from "@/features/public/landing-page";

export const metadata: Metadata = {
  title: "Artspace Barbearia",
  description: "Tatuagem, barbearia e piercing em Viçosa. Agende online.",
};

function teamBranch(ramo: string | undefined) {
  if (ramo === "tattoo" || ramo === "barber" || ramo === "piercing") return ramo;
  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ramo?: string }>;
}) {
  const { ramo } = await searchParams;
  return <LandingPage initialBranch={teamBranch(ramo)} />;
}
