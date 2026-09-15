import type { Metadata } from "next";
import { LandingPage } from "@/features/public/landing-page";

export const metadata: Metadata = {
  title: "Artspace Barbearia",
  description: "Tatuagem, barbearia e piercing em Viçosa. Agende online.",
};

export default function Home() {
  return <LandingPage />;
}
