import { expect, test } from "@playwright/test";

test("landing pública mostra identidade e o fluxo de agendar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ARTSPACE" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quem atende" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Maycom Michel" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Jhonatas" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Larisse Ribeiro" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver mais sobre Maycom Michel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver mais sobre Jhonatas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver mais sobre Larisse Ribeiro" })).toBeVisible();
  await expect(page.locator("#equipe").getByRole("link", { name: /Ver mais sobre Jonh/ })).toHaveCount(0);
  await expect(page.locator("#equipe").getByRole("link", { name: /Ver mais sobre Lucas/ })).toHaveCount(0);
  await page.locator("#ramos").getByRole("button", { name: /Tatuagem/ }).click();
  await expect(page.locator("#equipe").getByText("Maycom Michel")).toBeVisible();
  await expect(page.locator("#equipe").getByText("Jhonatas")).toBeVisible();
  await expect(page.locator("#equipe").getByText("Larisse Ribeiro")).toHaveCount(0);
  await page.locator("#agendar").getByRole("button", { name: /^Tatuagem/ }).click();
  await expect(page.locator("#equipe").getByText("Maycom Michel")).toBeVisible();
  await expect(page.locator("#equipe").getByText("Jhonatas")).toBeVisible();
  await expect(page.locator("#equipe").getByText("Larisse Ribeiro")).toHaveCount(0);
  await page.locator("#agendar").getByRole("button", { name: /^Piercing/ }).click();
  await expect(page.locator("#equipe").getByText("Larisse Ribeiro")).toBeVisible();
  await expect(page.locator("#equipe").getByText("Maycom Michel")).toHaveCount(0);
  await page.locator("#ramos").getByRole("button", { name: /Barbearia/ }).click();
  await expect(page.getByRole("heading", { name: "Agendar" })).toBeVisible();
  await page.locator("#agendar").getByRole("button", { name: /^Barbearia/ }).click();
  await expect(page.getByText("Qual corte você quer?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Fade/ })).toBeVisible();
  await page.getByRole("button", { name: /Fade/ }).click();
  await expect(page.getByText("Com quem você quer ser atendido?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Maycom Michel/ })).toBeVisible();
  await page.getByRole("button", { name: /Maycom Michel/ }).click();
  const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible({ timeout: 20_000 });
  await slot.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Nome")).toBeVisible();
  await expect(page.getByLabel("CPF")).toBeVisible();
  await expect(page.getByLabel("Telefone")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveCount(0);
  await expect(page.getByLabel("Senha")).toHaveCount(0);
});

test("ver mais do Maycom abre o perfil com texto e portfólio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ver mais sobre Maycom Michel" }).click();
  await expect(page).toHaveURL(/\/equipe\/maycom$/);
  await expect(page.getByRole("heading", { name: "Maycom Michel" })).toBeVisible();
  await expect(
    page.getByText("Minha trajetória como artista começou em 2013", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Cada tatuagem é única", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfólio" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Manga em realismo com leão, pomba e Cristo" })).toBeVisible();
  const maycomQuote = page.getByRole("link", { name: "Agendar com Maycom" });
  await expect(maycomQuote).toBeVisible();
  await expect(maycomQuote).toHaveAttribute("href", /wa\.me\/5531995638605/);
  await expect(maycomQuote).toHaveAttribute("href", /tatuagem/);
});

test("ver mais do Jhonatas abre o perfil com texto e portfólio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ver mais sobre Jhonatas" }).click();
  await expect(page).toHaveURL(/\/equipe\/jhonatas$/);
  await expect(page.getByRole("heading", { name: "Jhonatas" })).toBeVisible();
  await expect(page.getByText("sou tatuador há 5 anos", { exact: false })).toBeVisible();
  await expect(page.getByText("Este portfólio reúne um pouco da minha trajetória", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfólio" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Águia em preto e cinza no braço" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agendar com Jhonatas" })).toBeVisible();
});
