import Image from "next/image";
import Link from "next/link";
import { BRANCH_LABEL } from "@/shared/lib/types";
import { cn } from "@/shared/lib/cn";
import { quoteWhatsAppUrl, type TeamProfile } from "@/features/public/team-profiles";

export function ProfessionalProfile({
  profile,
  backHref = "/",
}: {
  profile: TeamProfile;
  backHref?: string;
}) {
  const quoteUrl = quoteWhatsAppUrl(profile.whatsapp, profile.branches);
  const firstName = profile.name.split(" ")[0];
  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/lion.webp" alt="Artspace" width={36} height={36} />
            <span className="font-serif tracking-[0.28em]">ARTSPACE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-sm text-gold hover:text-gold-bright">
              ← Voltar
            </Link>
            {quoteUrl ? (
              <a
                href={quoteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-gold px-4 text-sm text-ink"
              >
                Agendar
              </a>
            ) : (
              <Link
                href="/#agendar"
                className="inline-flex h-9 items-center rounded-full bg-gold px-4 text-sm text-ink"
              >
                Agendar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <p className="text-center text-xs tracking-[0.28em] text-gold">EQUIPE</p>
        <h1 className="mt-2 text-center font-serif text-4xl sm:text-5xl">{profile.name}</h1>
        <p className="mt-3 text-center text-sm text-muted">
          {profile.branches.map((item) => BRANCH_LABEL[item]).join(" · ")}
        </p>

        {profile.blocks.length > 0 && (
        <div className="mt-10 grid gap-10 sm:mt-14 sm:gap-16">
          {profile.blocks.map((block, index) => {
            const imageLeft = index % 2 === 1;
            return (
              <article
                key={block.text}
                className="grid items-center gap-5 sm:grid-cols-2 sm:gap-8 md:gap-12"
              >
                <p
                  className={cn(
                    "text-left text-lg leading-8 text-cream/90 sm:text-xl sm:leading-9 md:text-2xl md:leading-10",
                    imageLeft && "sm:order-2",
                  )}
                >
                  {block.text}
                </p>
                <div
                  className={cn(
                    "rounded-2xl border border-line bg-ink-soft sm:rounded-[2rem]",
                    imageLeft && "sm:order-1",
                  )}
                >
                  <Image
                    src={block.image}
                    alt={block.alt}
                    width={1200}
                    height={1500}
                    sizes="(min-width: 768px) 28rem, 100vw"
                    className="h-auto w-full rounded-[inherit] object-contain"
                    style={{ width: "100%", height: "auto" }}
                    priority={index === 0}
                  />
                </div>
              </article>
            );
          })}
        </div>
        )}

        {profile.portfolio.length > 0 && (
        <section className="mt-20">
          <h2 className="text-center font-serif text-3xl">Portfólio</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-base text-muted">
            Alguns trabalhos recentes.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.portfolio.map((item) => (
              <li
                key={item.src}
                className="rounded-3xl border border-line bg-ink-soft"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={1200}
                  height={1500}
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full rounded-[inherit] object-contain"
                  style={{ width: "100%", height: "auto" }}
                />
              </li>
            ))}
          </ul>
        </section>
        )}

        <div className="mt-14 flex justify-center">
          {quoteUrl ? (
            <a
              href={quoteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-gold px-6 text-sm text-ink"
            >
              Agendar com {firstName}
            </a>
          ) : (
            <Link
              href="/#agendar"
              className="inline-flex h-11 items-center rounded-full bg-gold px-6 text-sm text-ink"
            >
              Agendar com {firstName}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
