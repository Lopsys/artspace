import { describe, expect, it } from "vitest";
import {
  QUOTE_MESSAGE,
  applySavedProfile,
  canEditPortfolio,
  getTeamProfile,
  profileSlugForName,
  quoteWhatsAppUrl,
  teamProfileSlugs,
} from "@/features/public/team-profiles";

describe("team profiles", () => {
  it("publishes Maycom with one block per paragraph", () => {
    const profile = getTeamProfile("maycom");
    expect(profile?.name).toBe("Maycom Michel");
    expect(profile?.blocks).toHaveLength(4);
    expect(profile?.blocks[0].text).toMatch(/começou em 2013/);
    expect(profile?.portfolio.length).toBeGreaterThan(0);
  });

  it("publishes Jhonatas with one block per paragraph", () => {
    const profile = getTeamProfile("jhonatas");
    expect(profile?.name).toBe("Jhonatas");
    expect(profile?.blocks).toHaveLength(4);
    expect(profile?.blocks[0].text).toMatch(/tatuador há 5 anos/);
    expect(profile?.portfolio.length).toBeGreaterThan(0);
  });

  it("publishes Larisse with bio, photos and piercing quote", () => {
    const profile = getTeamProfile("larisse");
    expect(profile?.name).toBe("Larisse Ribeiro");
    expect(profile?.blocks).toHaveLength(5);
    expect(profile?.blocks[0].text).toMatch(/body piercer profissional desde 2021/);
    expect(profile?.blocks.at(-1)?.text).toMatch(/cuidado, segurança e atenção/);
    expect(profile?.portfolio.length).toBeGreaterThan(0);
  });

  it("resolves the landing button only when the page exists", () => {
    expect(profileSlugForName("Maycom Michel")).toBe("maycom");
    expect(profileSlugForName("Jhonatas")).toBe("jhonatas");
    expect(profileSlugForName("Larisse Ribeiro")).toBe("larisse");
    expect(profileSlugForName("Jonh Lenno")).toBeNull();
    expect(teamProfileSlugs()).toEqual(["maycom", "jhonatas", "larisse"]);
  });

  it("builds a WhatsApp quote for tattoo and piercing", () => {
    const maycom = getTeamProfile("maycom");
    const jhonatas = getTeamProfile("jhonatas");
    const larisse = getTeamProfile("larisse");
    const tattoo = quoteWhatsAppUrl(maycom?.whatsapp ?? "", ["tattoo", "barber"]);
    const piercing = quoteWhatsAppUrl(larisse?.whatsapp ?? "", ["piercing"]);
    expect(tattoo).toContain("https://wa.me/553195638605?text=");
    expect(quoteWhatsAppUrl(jhonatas?.whatsapp ?? "", ["tattoo"])).toContain(
      "https://wa.me/553182466728?text=",
    );
    expect(piercing).toContain("https://wa.me/553198687104?text=");
    expect(decodeURIComponent(tattoo ?? "")).toContain(QUOTE_MESSAGE.tattoo);
    expect(decodeURIComponent(piercing ?? "")).toContain(QUOTE_MESSAGE.piercing);
    expect(quoteWhatsAppUrl("3195638605", ["barber"])).toBeNull();
  });

  it("returns null for an unknown slug", () => {
    expect(getTeamProfile("lucas")).toBeNull();
  });

  it("lets tattoo and piercing edit the portfolio, and barbers only the photo", () => {
    expect(canEditPortfolio(["tattoo"])).toBe(true);
    expect(canEditPortfolio(["piercing"])).toBe(true);
    expect(canEditPortfolio(["tattoo", "barber"])).toBe(true);
    expect(canEditPortfolio(["barber"])).toBe(false);
  });

  it("keeps the published page until a saved profile replaces texts and photos", () => {
    const base = getTeamProfile("maycom");
    if (!base) throw new Error("missing maycom");
    expect(applySavedProfile(base, null).blocks).toHaveLength(4);
    const saved = applySavedProfile(base, {
      avatarUrl: "https://cdn.example/avatar.jpg",
      blocks: [{ text: "Novo texto", image: "https://cdn.example/a.jpg" }],
    });
    expect(saved.blocks).toEqual([
      { text: "Novo texto", image: "https://cdn.example/a.jpg", alt: "Trabalho" },
    ]);
    expect(saved.portfolio).toEqual(base.portfolio);
  });
});
