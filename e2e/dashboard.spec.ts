import { expect, test, type Page } from "@playwright/test";
import { addDays, format, setHours, setMinutes, startOfWeek } from "date-fns";

function slot(weekdayOffset: number, hour: number, minute = 0) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(
    setMinutes(setHours(addDays(start, weekdayOffset), hour), minute),
    "yyyy-MM-dd'T'HH:mm",
  );
}

async function loginMaycom(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("maycom@artspace.com.br");
  await page.getByLabel("Senha").fill("artspace123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("AGENDA", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe.serial("Dashboard Maycom", () => {
  test("login, CRUD procedimento, encaixe, status, remarcar, fechar dia, gráfico", async ({
    page,
  }) => {
    await loginMaycom(page);
    const stamp = Date.now();
    const procName = `Corte E2E ${stamp}`;
    const procEdited = `${procName} editado`;

    await page.getByRole("link", { name: "Procedimentos" }).click();
    await expect(page.getByRole("heading", { name: "Procedimentos" })).toBeVisible();

    await page.getByRole("button", { name: "Novo procedimento" }).click();
    await page.getByLabel("Nome").fill(procName);
    await page.getByLabel("Duração (minutos)").fill("30");
    await page.getByLabel("Valor (R$)").fill("70");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(procName, { exact: true })).toBeVisible();

    const e2eCard = page.locator("article").filter({ hasText: procName });
    await e2eCard.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Nome").fill(procEdited);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(procEdited, { exact: true })).toBeVisible();

    await page.getByRole("navigation").getByRole("link", { name: "Agenda" }).click();
    await expect(page.getByText("AGENDA", { exact: true })).toBeVisible();

    const client = `Cliente E2E ${stamp}`;
    const tail = String(stamp).slice(-10);
    const cpfA = `1${tail}`;
    const cpfB = `2${tail}`;
    const cpfC = `3${tail}`;
    const nameA = `${client} A`;
    const nameB = `${client} B`;
    const nameC = `${client} C`;

    async function encaixe(startsAt: string, name: string, cpf: string) {
      await page.getByRole("button", { name: /Encaixe/ }).click();
      await expect(page.getByRole("heading", { name: "Encaixar horário" })).toBeVisible();
      const procedure = page.getByLabel("Procedimento");
      const options = await procedure.locator("option").allTextContents();
      const e2e = options.find((label) => label.includes(procName) || label.includes(procEdited));
      if (e2e) {
        await procedure.selectOption({ label: e2e });
      }
      await page.getByLabel("Data e hora").fill(startsAt);
      await page.getByLabel("Nome do cliente").fill(name);
      await page.getByLabel("CPF").fill(cpf);
      await page.getByLabel("Telefone").fill("11988887777");
      await page.getByLabel("E-mail").fill(`cliente.e2e.${stamp}@artspace.com.br`);
      await page.getByRole("button", { name: "Encaixar" }).click();
      await expect(page.getByRole("heading", { name: "Encaixar horário" })).toHaveCount(0);
      await expect(page.getByText(name)).toBeVisible();
    }

    const minute = Number(String(stamp).slice(-2)) % 25;

    await encaixe(slot(0, 8, minute), nameA, cpfA);
    const cardA = page.locator("article.rounded-2xl").filter({ hasText: nameA });
    await cardA.getByRole("button", { name: "Confirmado" }).click();
    await expect(cardA.getByText("Confirmado", { exact: true })).toBeVisible();
    await cardA.getByRole("button", { name: "Presente" }).click();
    await expect(cardA.getByText("Presente", { exact: true })).toBeVisible();

    await encaixe(slot(0, 9, minute), nameB, cpfB);
    const cardB = page.locator("article.rounded-2xl").filter({ hasText: nameB });
    await cardB.getByRole("button", { name: "Faltou" }).click();
    await expect(cardB.getByText("Faltou", { exact: true })).toBeVisible();

    await encaixe(slot(0, 10, minute), nameC, cpfC);
    const cardC = page.locator("article.rounded-2xl").filter({ hasText: nameC });
    await cardC.getByRole("button", { name: "Remarcar" }).click();
    await expect(page.getByRole("heading", { name: "Remarcar atendimento" })).toBeVisible();
    await page.getByLabel("Novo horário").fill(slot(0, 12, minute));
    await page.getByRole("button", { name: "Confirmar remarcação" }).click();
    await expect(page.getByText("Remarcou").first()).toBeVisible();
    await expect(page.getByText(nameC).first()).toBeVisible();

    const cpfD = `4${tail}`;
    const nameD = `${client} D`;
    await encaixe(slot(0, 14, minute), nameD, cpfD);
    const cardD = page.locator("article.rounded-2xl").filter({ hasText: nameD });
    await cardD.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toHaveCount(0);
    await expect(page.getByText(nameD)).toHaveCount(0);

    await page.getByRole("link", { name: "Grade" }).click();
    await expect(page.getByRole("heading", { name: "Grade" })).toBeVisible();
    await page.getByRole("button", { name: /Aberta/ }).first().click();
    await expect(page.getByRole("button", { name: /Fechada/ }).first()).toBeVisible();

    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("heading", { name: "Financeiro" })).toBeVisible();
    await expect(page.getByText(/Faturamento no recorte/)).toBeVisible();
    await expect(page.getByText(/R\$/).first()).toBeVisible();

    await page.getByRole("link", { name: "Agenda" }).first().click();
    await page.getByRole("link", { name: "Procedimentos" }).click();
    await page
      .locator("article")
      .filter({ hasText: procEdited })
      .getByRole("button", { name: "Remover" })
      .click();
    await expect(page.getByText(procEdited, { exact: true })).toHaveCount(0);
  });
});

test("excluir agendamento remove o card e fecha o modal", async ({ page }) => {
  await loginMaycom(page);
  const stamp = Date.now();
  const name = `Cliente Del ${stamp}`;
  const cpf = `9${String(stamp).slice(-10)}`;
  const startsAt = slot(0, 6, Number(String(stamp).slice(-2)) % 25);

  await page.getByRole("button", { name: /Encaixe/ }).click();
  await expect(page.getByRole("heading", { name: "Encaixar horário" })).toBeVisible();
  await page.getByLabel("Data e hora").fill(startsAt);
  await page.getByLabel("Nome do cliente").fill(name);
  await page.getByLabel("CPF").fill(cpf);
  await page.getByLabel("Telefone").fill("11988887777");
  await page.getByLabel("E-mail").fill(`cliente.del.${stamp}@artspace.com.br`);
  await page.getByRole("button", { name: "Encaixar" }).click();
  await expect(page.getByRole("heading", { name: "Encaixar horário" })).toHaveCount(0);
  await expect(page.getByText(name)).toBeVisible();

  const card = page.locator("article.rounded-2xl").filter({ hasText: name });
  await card.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toHaveCount(0);
  await expect(page.getByText(name)).toBeVisible();

  await card.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toHaveCount(0);
  await expect(page.getByText(name)).toHaveCount(0);
});
