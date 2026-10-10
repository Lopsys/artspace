import type { Branch } from "@/shared/lib/types";
import { onlyDigits } from "@/shared/lib/format";

export type ProfileBlock = {
  text: string;
  image: string;
  alt: string;
};

export type TeamProfile = {
  slug: string;
  name: string;
  branches: Branch[];
  whatsapp: string;
  blocks: ProfileBlock[];
  portfolio: { src: string; alt: string }[];
};

export const QUOTE_MESSAGE = {
  tattoo: "olá, gostaria de fazer um orçamento personalizado para minha tattoo",
  piercing: "olá, gostaria de fazer um orçamento para colocar um piercing",
} as const;

export function quoteKind(branches: Branch[]): "tattoo" | "piercing" | null {
  if (branches.includes("tattoo")) return "tattoo";
  if (branches.includes("piercing")) return "piercing";
  return null;
}

export type SavedBlock = { text: string; image: string; alt?: string };
export type SavedPortfolioItem = { src: string; alt: string };

export type SavedPublicProfile = {
  avatarUrl?: string | null;
  blocks?: SavedBlock[];
  portfolio?: SavedPortfolioItem[];
};

export function canEditPortfolio(branches: Branch[]) {
  return quoteKind(branches) !== null;
}

export function applySavedProfile(
  base: TeamProfile,
  saved: SavedPublicProfile | null,
): TeamProfile {
  if (!saved) return base;
  return {
    ...base,
    blocks: saved.blocks
      ? saved.blocks.map((block) => ({
          text: block.text,
          image: block.image,
          alt: block.alt?.trim() || "Trabalho",
        }))
      : base.blocks,
    portfolio: saved.portfolio ?? base.portfolio,
  };
}

export function quoteWhatsAppUrl(phone: string, branches: Branch[]) {
  const kind = quoteKind(branches);
  if (!kind) return null;
  const digits = onlyDigits(phone);
  if (!digits) return null;
  const withCountry =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(QUOTE_MESSAGE[kind])}`;
}

const PROFILES: Record<string, TeamProfile> = {
  maycom: {
    slug: "maycom",
    name: "Maycom Michel",
    branches: ["tattoo", "barber"],
    whatsapp: "3195638605",
    blocks: [
      {
        text: "Minha trajetória como artista começou em 2013, movida pela paixão por transformar ideias em arte na pele.",
        image: "/team/maycom/sleeve-lion.jpg",
        alt: "Manga em realismo com leão, pomba e Cristo",
      },
      {
        text: "Ao longo dos anos, busquei aperfeiçoamento constante e me especializei em Realismo, Fine Line e Coberturas, desenvolvendo um estilo marcado pela atenção aos detalhes, técnica e cuidado em cada trabalho.",
        image: "/team/maycom/portrait-baby.jpg",
        alt: "Retrato realista de bebê",
      },
      {
        text: "Minha experiência também foi reconhecida através de premiações em convenções de tatuagem, reforçando a busca contínua por evolução e excelência.",
        image: "/team/maycom/clock-stair.jpg",
        alt: "Relógio e escada em realismo no ombro",
      },
      {
        text: "Cada tatuagem é única. Meu objetivo é transformar histórias, referências e ideias em trabalhos que tenham identidade e significado para cada cliente.",
        image: "/team/maycom/wolf.jpg",
        alt: "Lobo em fine line com montanha e lua",
      },
    ],
    portfolio: [
      { src: "/team/maycom/raven.jpg", alt: "Corvo em realismo no braço" },
      { src: "/team/maycom/prayer.jpg", alt: "Cristo em oração na perna" },
      { src: "/team/maycom/puppet-hand.jpg", alt: "Mão e marionete em realismo" },
      { src: "/team/maycom/knight.jpg", alt: "Elmo e medalha de São Bento no ombro" },
      { src: "/team/maycom/angel.jpg", alt: "Anjo em realismo na perna" },
    ],
  },
  jhonatas: {
    slug: "jhonatas",
    name: "Jhonatas",
    branches: ["tattoo"],
    whatsapp: "3182466728",
    blocks: [
      {
        text: "Meu nome é Jhonatas, sou tatuador há 5 anos.",
        image: "/team/jhonatas/eagle.jpg",
        alt: "Águia em preto e cinza no braço",
      },
      {
        text: "Minha história na tatuagem começou em Abre Campo-MG, cidade onde nasci. Há 3 anos, escolhi Viçosa-MG para continuar construindo minha trajetória e aprimorando cada vez mais minha arte.",
        image: "/team/jhonatas/wolf-flowers.jpg",
        alt: "Lobo com flores nas costas",
      },
      {
        text: "Tenho como estilos favoritos o Realismo Preto e Cinza e o Fine Line, buscando sempre trabalhar cada detalhe com precisão e personalidade. Ao mesmo tempo, gosto de explorar diferentes estilos e técnicas, porque acredito que cada tatuagem é uma oportunidade de evoluir e criar algo único.",
        image: "/team/jhonatas/cherubs.jpg",
        alt: "Manga com anjos em realismo preto e cinza",
      },
      {
        text: "Este portfólio reúne um pouco da minha trajetória, do meu estilo e daquilo que venho construindo ao longo desses anos.",
        image: "/team/jhonatas/leaves.jpg",
        alt: "Folhas de costela-de-adão em fine line no braço",
      },
    ],
    portfolio: [
      { src: "/team/jhonatas/lioness.jpg", alt: "Leoa e filhote em fine line no ombro" },
    ],
  },
  larisse: {
    slug: "larisse",
    name: "Larisse Ribeiro",
    branches: ["piercing"],
    whatsapp: "3198687104",
    blocks: [
      {
        text: "Olá, seja bem-vindo(a)! Sou Larisse Ribeiro, body piercer profissional desde 2021.",
        image: "/team/larisse/portrait.jpg",
        alt: "Larisse Ribeiro com modelo de orelha e joias de piercing",
      },
      {
        text: "Atuo com perfurações tradicionais, utilizando joias em titânio grau de implante, escolhidas pensando na qualidade e no processo de cicatrização.",
        image: "/team/larisse/nostril.jpg",
        alt: "Piercing no nariz com joia em titânio",
      },
      {
        text: "Também ofereço avaliação de cicatrização e remoção de piercings, sempre com atenção às necessidades de cada cliente.",
        image: "/team/larisse/navel.jpg",
        alt: "Piercing no umbigo com joia em titânio",
      },
      {
        text: "Mais do que colocar um piercing, meu objetivo é cuidar de cada detalhe para que você tenha um atendimento seguro, responsável e personalizado.",
        image: "/team/larisse/ear-cluster.jpg",
        alt: "Projeto de piercings na orelha com joias em titânio",
      },
      {
        text: "Seu piercing com cuidado, segurança e atenção aos detalhes.",
        image: "/team/larisse/industrial.jpg",
        alt: "Piercing industrial e composição na orelha",
      },
    ],
    portfolio: [
      { src: "/team/larisse/ear-gold.jpg", alt: "Piercings em ouro na orelha com borboleta" },
    ],
  },
};

export function teamProfileSlugs() {
  return Object.keys(PROFILES);
}

export function getTeamProfile(slug: string) {
  return PROFILES[slug] ?? null;
}

export function publicSlug(name: string) {
  const first = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0];
  return first || null;
}

export function profileSlugForName(name: string) {
  const slug = publicSlug(name);
  return slug && PROFILES[slug] ? slug : null;
}
