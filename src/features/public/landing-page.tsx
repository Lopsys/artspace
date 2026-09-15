"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookingWizard } from "@/features/public/booking-wizard";
import type { PublicCatalog } from "@/features/public/catalog";
import { fetchCatalog } from "@/features/public/public-api";
import { BRANCH_LABEL, type Branch } from "@/shared/lib/types";
import { STUDIO } from "@/shared/lib/studio-public";
import { Button } from "@/shared/components/ui/button";

const BRANCHES: Branch[] = ["tattoo", "barber", "piercing"];

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<PublicCatalog>({
    professionals: [],
    procedures: [],
  });
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch(() => setCatalog({ professionals: [], procedures: [] }));
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 28,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          scrollTrigger: { trigger: element, start: "top 82%" },
          opacity: 0,
          y: 36,
          duration: 0.8,
          ease: "power2.out",
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="min-h-screen bg-ink text-cream">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="#topo" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Artspace" width={36} height={36} />
            <span className="font-serif tracking-[0.28em]">ARTSPACE</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <a href="#ramos" className="hover:text-cream">
              Ramos
            </a>
            <a href="#equipe" className="hover:text-cream">
              Equipe
            </a>
            <a href="#agendar" className="hover:text-cream">
              Agendar
            </a>
            <a href="#contato" className="hover:text-cream">
              Contato
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/conta" className="hidden text-sm text-muted hover:text-cream sm:inline">
              Meus horários
            </Link>
            <Link href="/login" className="text-sm text-gold hover:text-gold-bright">
              Equipe
            </Link>
            <Button className="h-9 px-4" onClick={() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })}>
              Agendar
            </Button>
          </div>
        </div>
      </header>

      <main id="topo" className="pt-20">
        <section className="mx-auto grid min-h-[88vh] max-w-6xl place-items-center px-4 py-16 text-center">
          <div>
            <div data-hero>
              <Image
                src="/logo.png"
                alt="Leão Artspace"
                width={220}
                height={220}
                className="mx-auto"
                priority
              />
            </div>
            <h1
              data-hero
              className="mt-4 font-serif text-5xl tracking-[0.28em] text-cream sm:text-7xl"
            >
              ARTSPACE
            </h1>
            <div data-hero className="mt-4 flex items-center justify-center gap-4 text-gold">
              <span className="h-px w-12 bg-gold" />
              <p className="text-sm tracking-[0.28em]">Barbearia</p>
              <span className="h-px w-12 bg-gold" />
            </div>
            <p data-hero className="mx-auto mt-6 max-w-md text-muted">
              {STUDIO.tagline}. Uma agenda por profissional, no seu tempo.
            </p>
            <div data-hero className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                onClick={() =>
                  document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Agendar horário
              </Button>
              <a
                href={`https://wa.me/55${STUDIO.phone}`}
                className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm text-cream hover:border-gold/60"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section id="ramos" className="mx-auto max-w-6xl px-4 py-20">
          <p data-reveal className="text-xs tracking-[0.28em] text-gold">
            O ESTÚDIO
          </p>
          <h2 data-reveal className="mt-2 font-serif text-4xl">
            Três ramos, uma casa
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BRANCHES.map((item) => (
              <button
                key={item}
                data-reveal
                type="button"
                className="rounded-[2rem] border border-line bg-ink-soft p-6 text-left transition hover:border-gold/50"
                onClick={() => {
                  setBranch(item);
                  document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <p className="font-serif text-3xl text-cream">{BRANCH_LABEL[item]}</p>
                <p className="mt-3 text-sm text-muted">
                  Escolha o atendimento e com quem você quer ser atendido.
                </p>
              </button>
            ))}
          </div>
        </section>

        <section id="equipe" className="mx-auto max-w-6xl px-4 py-20">
          <p data-reveal className="text-xs tracking-[0.28em] text-gold">
            EQUIPE
          </p>
          <h2 data-reveal className="mt-2 font-serif text-4xl">
            Quem atende
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.professionals.map((person) => (
              <article
                key={person.id}
                data-reveal
                className="rounded-[2rem] border border-line bg-ink-soft p-5"
              >
                <p className="font-serif text-2xl">{person.name}</p>
                <p className="mt-2 text-sm text-muted">
                  {person.branches.map((item) => BRANCH_LABEL[item]).join(" · ") || "Equipe"}
                </p>
              </article>
            ))}
            {catalog.professionals.length === 0 && (
              <p className="text-sm text-muted">A equipe aparece aqui depois do primeiro login interno.</p>
            )}
          </div>
        </section>

        <section id="agendar" className="mx-auto max-w-3xl px-4 py-20">
          <div data-reveal>
            <BookingWizard
              key={branch ?? "all"}
              catalog={catalog}
              presetBranch={branch}
            />
          </div>
        </section>

        <footer id="contato" className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
            <div>
              <p className="font-serif tracking-[0.28em]">ARTSPACE</p>
              <p className="mt-2 text-sm text-muted">{STUDIO.tagline}</p>
            </div>
            <div className="text-sm text-muted">
              <p>{STUDIO.address}</p>
              <p>CEP {STUDIO.cep}</p>
              <p className="mt-2">{STUDIO.hoursLabel}</p>
              <p>{STUDIO.hoursNote}</p>
            </div>
            <div className="text-sm">
              <a href={`tel:+55${STUDIO.phone}`} className="block text-cream hover:text-gold">
                {STUDIO.phoneLabel}
              </a>
              <a
                href={STUDIO.instagramUrl}
                className="mt-2 block text-gold hover:text-gold-bright"
                target="_blank"
                rel="noreferrer"
              >
                @{STUDIO.instagram}
              </a>
              <Link href="/login" className="mt-6 block text-xs text-muted hover:text-cream">
                Acesso da equipe
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
