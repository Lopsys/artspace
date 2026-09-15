import { expect, test } from "@playwright/test";

test("landing pública mostra identidade e o fluxo de agendar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ARTSPACE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agendar horário" })).toBeVisible();
  await page.getByRole("button", { name: "Agendar horário" }).click();
  await expect(page.getByRole("heading", { name: "Agendar" })).toBeVisible();
  await page.locator("#agendar").getByRole("button", { name: /Tatuagem/ }).click();
  await expect(page.getByText("Qual atendimento você quer?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tattoo pequena/ })).toBeVisible();
  await page.getByRole("button", { name: /Tattoo pequena/ }).click();
  await expect(page.getByText("Com quem você quer ser atendido?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Maycom Michel/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Jhonatas/ })).toBeVisible();
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
