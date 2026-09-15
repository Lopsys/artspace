import type { Metadata } from "next";
import { Cinzel, Outfit } from "next/font/google";
import { StudioProvider } from "@/features/studio/store";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Artspace Barbearia",
  description: "Tatuagem, barbearia e piercing. Agende online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-cream">
        <StudioProvider>{children}</StudioProvider>
      </body>
    </html>
  );
}
