import { describe, expect, it } from "vitest";
import { initials, portraitFor, slugName, sortTeamForLanding } from "@/features/public/portraits";

describe("portraitFor", () => {
  it("uses the uploaded photo when the account already has one", () => {
    expect(portraitFor("Maycom Michel", "/storage/maycom.webp")).toEqual({
      src: "/storage/maycom.webp",
    });
  });

  it("maps Maycom, Jhonatas and Larisse to the current studio portraits", () => {
    expect(portraitFor("Maycom Michel")?.src).toBe("/team/maycom.jpg");
    expect(portraitFor("Jhonatas")?.src).toBe("/team/jhonatas.jpg");
    expect(portraitFor("Jhonatas Alves")?.src).toBe("/team/jhonatas.jpg");
    expect(portraitFor("Larisse Ribeiro")?.src).toBe("/team/larisse.jpg");
  });

  it("leaves the others ready for a future photo", () => {
    expect(portraitFor("Jonh Lenno")).toBeNull();
    expect(portraitFor("Lucas Souza")).toBeNull();
  });
});

describe("initials", () => {
  it("uses first and last name, or two letters of a single name", () => {
    expect(initials("Maycom Michel")).toBe("MM");
    expect(initials("Jhonatas")).toBe("JH");
    expect(initials("Larisse Ribeiro")).toBe("LR");
  });
});

describe("slugName", () => {
  it("normalizes accents and case", () => {
    expect(slugName("  Jhonatás  ")).toBe("jhonatas");
  });
});

describe("sortTeamForLanding", () => {
  it("places Larisse right after Jhonatas", () => {
    const ordered = sortTeamForLanding([
      { name: "Lucas Souza" },
      { name: "Maycom Michel" },
      { name: "Larisse Ribeiro" },
      { name: "Jhonatas" },
      { name: "Jonh Lenno" },
    ]);
    expect(ordered.map((person) => person.name)).toEqual([
      "Maycom Michel",
      "Jhonatas",
      "Larisse Ribeiro",
      "Jonh Lenno",
      "Lucas Souza",
    ]);
  });
});
