"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  const team = useMemo(() => {
    const ordered = sortTeamForLanding(catalog.professionals);
    if (!teamFocus || teamFocus === "barber") return ordered;
    return ordered.filter((person) => person.branches.includes(teamFocus));
  }, [catalog.professionals, teamFocus]);

  function openBranch(item: Branch) {
    if (item === "barber") {
      setTeamFocus(null);
      document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setTeamFocus(item);
    document.getElementById("equipe")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch(() => setCatalog({ professionals: [], procedures: [] }));
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 16,
        duration: 0.75,
        stagger: 0.12,
        ease: "sine.out",
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
  }, [introDone]);

  return (
    <div ref={root} className="min-h-screen bg-ink text-cream">
      {!introDone && <LionIntro target={heroLion} onDone={finishIntro} />}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
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

      <main id="topo" className="pt-20">
        <section className="mx-auto grid min-h-[88vh] max-w-6xl place-items-center px-4 py-16 text-center">
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
            <div data-hero className="mt-4 flex items-center justify-center gap-4 text-gold">
              <span className="h-px w-12 bg-gold" />
              <p className="text-sm tracking-[0.28em]">Barbearia</p>
              <span className="h-px w-12 bg-gold" />
            </div>
            <p data-hero className="mx-auto mt-6 max-w-md text-muted">
              {STUDIO.tagline}. <br />Uma agenda por profissional, no seu tempo.
            </p>
            <div data-hero className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                onClick={() =>
                  document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Agendar horário
              </Button>
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

        <section id="equipe" className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p data-reveal className="text-xs tracking-[0.28em] text-gold">
            EQUIPE
          </p>
          <h2 data-reveal className="mt-2 font-serif text-4xl">
            Quem atende
          </h2>
          {teamFocus && teamFocus !== "barber" && (
            <p className="mt-3 text-sm text-muted">{BRANCH_LABEL[teamFocus]}</p>
          )}
          <ul className="mx-auto mt-12 flex max-w-xs flex-col items-center gap-14">
            {team.map((person) => {
              const portrait = portraitFor(person.name, person.avatarUrl);
              const slug = profileSlugForName(person.name);
              const showMore = Boolean(slug) && Boolean(quoteKind(person.branches));
              const moreClassName =
                "mt-4 inline-flex h-10 items-center justify-center rounded-full border border-line px-6 text-sm text-cream hover:border-gold/60";
              return (
                <li key={person.id} data-reveal className="w-full">
                  <article className="grid justify-items-center">
                    <div className="relative aspect-square w-40 overflow-hidden rounded-full border-2 border-gold/55 bg-ink-soft shadow-[0_0_0_6px_rgba(196,163,90,0.08)] sm:w-44">
                      {portrait ? (
                        <Image
                          src={portrait.src}
                          alt={person.name}
                          fill
                          sizes="176px"
                          className="object-cover"
                          style={
                            portrait.position
                              ? { objectPosition: portrait.position }
                              : undefined
                          }
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="grid h-full place-items-center font-serif text-3xl text-gold"
                        >
                          {initials(person.name)}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 font-serif text-2xl leading-tight text-cream">
                      {person.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {person.branches.map((item) => BRANCH_LABEL[item]).join(" · ") ||
                        "Equipe"}
                    </p>
                    {showMore && slug && (
                      <Link
                        href={`/equipe/${slug}`}
                        aria-label={`Ver mais sobre ${person.name}`}
                        className={moreClassName}
                      >
                        Ver mais
                      </Link>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
          {team.length === 0 && (
            <p className="mt-8 text-sm text-muted">
              A equipe aparece aqui depois do primeiro login interno.
            </p>
          )}
          {teamFocus && teamFocus !== "barber" && (
            <button
              type="button"
              className="mt-10 text-sm text-gold"
              onClick={() => setTeamFocus(null)}
            >
              Ver toda a equipe
            </button>
          )}
        </section>

        <section id="agendar" className="mx-auto max-w-3xl px-4 py-20">
          <div data-reveal>
            <BookingWizard catalog={catalog} onQuoteBranch={openBranch} />
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
