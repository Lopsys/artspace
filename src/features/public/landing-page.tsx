"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { BookingWizard } from "@/features/public/booking-wizard";
import type { PublicCatalog } from "@/features/public/catalog";
import { fetchCatalog } from "@/features/public/public-api";
import { BRANCH_LABEL, type Branch } from "@/shared/lib/types";
import { STUDIO } from "@/shared/lib/studio-public";
import { Button } from "@/shared/components/ui/button";
import { initials, portraitFor, sortTeamForLanding } from "@/features/public/portraits";
import { profileSlugForName, quoteKind } from "@/features/public/team-profiles";
import { LionIntro } from "@/features/public/lion-intro";

const BRANCHES: Branch[] = ["tattoo", "barber", "piercing"];
type Panel = "hero" | "studio" | "team" | "booking";

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const heroLion = useRef<HTMLDivElement>(null);
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const [catalog, setCatalog] = useState<PublicCatalog>({
    professionals: [],
    procedures: [],
  });
  const [teamFocus, setTeamFocus] = useState<Branch | null>(null);
  const [panel, setPanel] = useState<Panel>("hero");
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const team = useMemo(() => {
    const ordered = sortTeamForLanding(catalog.professionals);
    if (!teamFocus) return ordered;
    return ordered.filter((person) => person.branches.includes(teamFocus));
  }, [catalog.professionals, teamFocus]);

  function openBranch(item: Branch) {
    setTeamFocus(item);
    setPanel("team");
  }

  function openBarberBooking(professionalId: string) {
    setSelectedBarberId(professionalId);
    setPanel("booking");
  }

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch(() => setCatalog({ professionals: [], procedures: [] }));
  }, []);

  useEffect(() => {
    const ramo = new URLSearchParams(window.location.search).get("ramo");
    if (ramo === "tattoo" || ramo === "barber" || ramo === "piercing") {
      setIntroDone(true);
      setTeamFocus(ramo);
      setPanel("team");
    }
  }, []);

  useEffect(() => {
    const blockScroll = (event: Event) => {
      event.preventDefault();
    };
    const blockKeys = (event: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (!typing && keys.includes(event.key)) event.preventDefault();
    };
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("keydown", blockKeys);
    return () => {
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("keydown", blockKeys);
    };
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 16,
        duration: 0.75,
        stagger: 0.12,
        ease: "sine.out",
      });
    }, root);
    return () => ctx.revert();
  }, [introDone]);

  return (
    <div ref={root} className="fixed inset-0 flex flex-col overflow-clip bg-ink text-cream">
      {!introDone && <LionIntro target={heroLion} onDone={finishIntro} />}
      <header className="relative z-40 shrink-0 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="#topo" className="flex items-center gap-3">
            <Image src="/lion.webp" alt="Artspace" width={36} height={36} />
            <span className="font-serif tracking-[0.28em]">ARTSPACE</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <a href="#ramos" className="hover:text-cream">
              Ramos
            </a>
            <button
              type="button"
              className="hover:text-cream"
              onClick={() => {
                setTeamFocus(null);
                document.getElementById("equipe")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Equipe
            </button>
            <a href="#agendar" className="hover:text-cream">
              Agendar
            </a>
            <a href="#contato" className="hover:text-cream">
              Contato
            </a>
          </nav>
          <Button className="h-9 px-4" onClick={() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })}>
            Agendar
          </Button>
        </div>
      </header>

      <main id="topo" className="min-h-0 flex-1 overflow-clip">
        <section
          className={
            panel === "hero"
              ? "mx-auto grid h-full max-w-6xl place-items-center px-4 text-center"
              : "hidden"
          }
        >
          <div>
            <div ref={heroLion}>
              <Image
                src="/lion.webp"
                alt="Leão Artspace"
                width={220}
                height={220}
                className="mx-auto"
                style={{ opacity: introDone ? 1 : 0 }}
                priority
              />
            </div>
            <h1
              data-hero
              className="mt-4 font-serif text-5xl tracking-[0.28em] text-cream sm:text-7xl"
            >
              ARTSPACE
            </h1>
            <div data-hero className="mx-auto mt-4 h-px w-24 bg-gold" />
            <p data-hero className="mx-auto mt-6 max-w-md text-muted">
              {STUDIO.tagline}. <br />Uma agenda por profissional, no seu tempo.
            </p>
            <div data-hero className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => setPanel("studio")}>Agendar horário</Button>
            </div>
          </div>
        </section>

        <section
          id="ramos"
          className={
            panel === "studio"
              ? "mx-auto grid h-full max-w-6xl content-center px-4"
              : "hidden"
          }
        >
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
                onClick={() => openBranch(item)}
              >
                <p className="font-serif text-3xl text-cream">{BRANCH_LABEL[item]}</p>
                <p className="mt-3 text-sm text-muted">
                  {item === "barber"
                    ? "Escolha o corte, o profissional e o horário."
                    : item === "tattoo"
                      ? "Veja quem tatua e peça o orçamento."
                      : "Veja quem faz piercing e peça o orçamento."}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section
          id="equipe"
          className={
            panel === "team"
              ? "mx-auto flex h-full w-full max-w-6xl flex-col items-center overflow-hidden px-4 py-3 text-center"
              : "hidden"
          }
        >
          <div className="shrink-0 pb-3">
            <button
              type="button"
              className="text-sm text-gold hover:text-gold-bright"
              onClick={() => setPanel("studio")}
            >
              ← Voltar
            </button>
            <p data-reveal className="mt-2 text-xs tracking-[0.28em] text-gold">
              EQUIPE
            </p>
            <h2 data-reveal className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
              Escolha seu profissional
            </h2>
            {teamFocus && <p className="mt-1 text-sm text-muted">{BRANCH_LABEL[teamFocus]}</p>}
          </div>
          <ul
            className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden ${
              team.length <= 1 ? "gap-4" : team.length === 2 ? "gap-5" : "gap-4"
            }`}
          >
            {team.map((person) => {
              const portrait = portraitFor(person.name, person.avatarUrl);
              const slug = profileSlugForName(person.name);
              const linked = Boolean(slug) && Boolean(quoteKind(person.branches));
              const bookBarber = teamFocus === "barber";
              const photoMax =
                team.length <= 1 ? "16rem" : team.length === 2 ? "11.5rem" : "8.25rem";
              const frameClass =
                "relative block aspect-square max-h-full overflow-hidden rounded-full border-2 border-gold/55 bg-ink-soft shadow-[0_0_0_6px_rgba(196,163,90,0.08)]";
              const frameStyle = {
                height: `min(100%, ${photoMax})`,
                width: "auto",
              } as const;
              const portraitNode = portrait ? (
                <Image
                  src={portrait.src}
                  alt={linked ? "" : person.name}
                  fill
                  sizes={team.length <= 1 ? "256px" : team.length === 2 ? "184px" : "132px"}
                  className="object-cover"
                  style={
                    portrait.position ? { objectPosition: portrait.position } : undefined
                  }
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-full place-items-center font-serif text-2xl text-gold"
                >
                  {initials(person.name)}
                </span>
              );
              return (
                <li
                  key={person.id}
                  data-reveal
                  className="flex min-h-0 flex-1 flex-col items-center overflow-hidden"
                >
                  <div className="flex min-h-0 w-full flex-1 items-center justify-center p-2">
                    {bookBarber ? (
                      <button
                        type="button"
                        aria-label={`Agendar com ${person.name}`}
                        className={`${frameClass} transition hover:border-gold`}
                        style={frameStyle}
                        onClick={() => openBarberBooking(person.id)}
                      >
                        {portraitNode}
                      </button>
                    ) : linked && slug ? (
                      <Link
                        href={`/equipe/${slug}?ramo=${teamFocus ?? "tattoo"}`}
                        aria-label={`Ver perfil de ${person.name}`}
                        className={`${frameClass} transition hover:border-gold`}
                        style={frameStyle}
                      >
                        {portraitNode}
                      </Link>
                    ) : (
                      <div className={frameClass} style={frameStyle}>
                        {portraitNode}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 pt-2">
                    <p
                      className={`font-serif leading-tight text-cream ${
                        team.length <= 2 ? "text-xl" : "text-base"
                      }`}
                    >
                      {person.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {person.branches.map((item) => BRANCH_LABEL[item]).join(" · ") ||
                        "Equipe"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {team.length === 0 && (
            <p className="mt-8 text-sm text-muted">
              A equipe aparece aqui depois do primeiro login interno.
            </p>
          )}
        </section>

        <section
          id="agendar"
          className={
            panel === "booking"
              ? "mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-4 py-3"
              : "hidden"
          }
        >
          <div className="min-h-0 flex-1">
            <BookingWizard
              catalog={catalog}
              professionalId={selectedBarberId}
              onQuoteBranch={openBranch}
              onBack={() => setPanel("team")}
            />
          </div>
        </section>

        <footer id="contato" className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <Image src="/lion.webp" alt="" width={36} height={36} />
                <p className="font-serif tracking-[0.28em]">ARTSPACE</p>
              </div>
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
