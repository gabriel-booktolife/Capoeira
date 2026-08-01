import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "O fluxo funcional é coberto uma vez; responsividade é testada separadamente.");
  await page.goto("/admin");
  await page.getByLabel("E-mail").fill("admin.e2e@example.com");
  await page.getByLabel("Senha").fill("senha-segura-e2e");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

async function publish(page: Page, collection: string, values: Record<string, string>) {
  await page.goto(`/admin/dashboard/${collection}`);
  for (const [label, value] of Object.entries(values)) await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Conteúdo publicado.")).toBeVisible();
}

test("CRUD, rascunhos, publicação, prévia, responsáveis e exclusão", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/dashboard/publications");
  await page.getByLabel("Título").fill("Rascunho reservado");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("public/media/logo.webp"));
  await expect(page.getByText("Mídia anexada com sucesso.")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Texto alternativo").fill("Símbolo do Chão Batido");
  await page.getByLabel("Texto alternativo").blur();
  await expect(page.getByText("Descrição da mídia atualizada.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Remover logo.webp/ }).click();
  await expect(page.getByText("Mídia removida.")).toBeVisible();
  await page.goto("/publicacoes");
  await expect(page.getByText("Rascunho reservado")).toHaveCount(0);

  await publish(page, "team", { Nome: "Mestra Teste", História: "História preservada para o teste integrado." });
  await publish(page, "events", { Título: "Roda de integração", Descrição: "Encontro para validar o fluxo.", Data: "2026-08-08" });
  await publish(page, "locations", { Nome: "Sede de teste", Endereço: "Rua do Berimbau, 100" });
  await publish(page, "publications", { Título: "Publicação integrada", Descrição: "Conteúdo publicado pelo painel." });

  await page.goto("/admin/dashboard/initiatives");
  await page.locator('input[name="title"]').fill("Projeto integração");
  await page.locator('textarea[name="description"]').fill("Iniciativa criada pelo fluxo completo.");
  await page.getByLabel("Responsáveis").selectOption({ label: "Mestra Teste" });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Conteúdo publicado.")).toBeVisible();
  const previewPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Prévia" }).click();
  const preview = await previewPromise;
  await expect(preview.getByText("Prévia protegida")).toBeVisible();
  await expect(preview.getByRole("heading", { level: 1, name: "Projeto integração" })).toBeVisible();
  await preview.close();

  await page.goto("/admin/dashboard/stories");
  await page.getByLabel("Título").fill("Capítulo de teste");
  await page.getByLabel("Texto da história").fill("Um bloco válido mantém a história completa.");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Conteúdo publicado.")).toBeVisible();

  await page.goto("/eventos");
  await expect(page.getByText("Roda de integração")).toBeVisible();
  await page.goto("/equipe");
  await expect(page.getByText("Mestra Teste")).toBeVisible();
  await page.goto("/historia");
  await expect(page.getByText("Capítulo de teste")).toBeVisible();

  await page.goto("/admin/dashboard/locations");
  await page.getByText("Sede de teste", { exact: true }).first().click();
  page.once("dialog", (dialog) => dialog.accept("Sede de teste"));
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Conteúdo e mídias removidos definitivamente.")).toBeVisible();
  await page.goto("/locais");
  await expect(page.getByText("Sede de teste")).toHaveCount(0);
});
