import { expect, test } from "@playwright/test";

async function expectAdminContentToFit(page: import("@playwright/test").Page) {
  const clipped = await page.locator(".admin-content").evaluate((root) => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(root.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0
          && (rect.left < -0.5 || rect.right > viewportWidth + 0.5);
      })
      .slice(0, 20)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()}.${element.className} (${rect.left.toFixed(1)}–${rect.right.toFixed(1)})`;
      });
  });
  expect(clipped, `Elementos cortados em ${await page.url()}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("E-mail").fill("admin.e2e@example.com");
  await page.getByLabel("Senha").fill("senha-segura-e2e");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test("formulários completos não cortam campos no mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/admin/dashboard/events");
  await expect(page.getByRole("heading", { name: "Eventos", level: 1 })).toBeVisible();
  await expect(page.locator(".admin-editor")).toBeHidden();
  await page.getByRole("button", { name: "Novo evento" }).click();
  await expect(page.locator(".admin-editor")).toBeVisible();
  await page.getByRole("button", { name: "Amanhã" }).click();
  await expect(page.getByLabel("Data: dia")).not.toHaveValue("");
  await expect(page.getByText("Selecionar arquivos", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCSS("opacity", "0");
  await expectAdminContentToFit(page);

  await page.goto("/admin/dashboard/initiatives");
  await page.getByRole("button", { name: "Nova iniciativa" }).click();
  await page.getByRole("button", { name: "Adicionar horário" }).click();
  await expect(page.getByLabel("Remover horário")).toBeVisible();
  await expectAdminContentToFit(page);

  await page.goto("/admin/dashboard/team");
  await page.getByRole("button", { name: "Novo membro" }).click();
  await expectAdminContentToFit(page);

  await page.goto("/admin/dashboard/configuracoes");
  await expectAdminContentToFit(page);

  if (process.env.CAPTURE_ADMIN_UI === "1" && testInfo.project.name === "desktop") {
    await page.screenshot({ path: "/tmp/chao-admin-mobile.png", fullPage: true });
  }
});

test("editor mobile só aparece quando solicitado e permite voltar à lista", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/dashboard/publications");
  const editor = page.locator(".admin-editor");

  await expect(editor).toBeHidden();
  await page.getByRole("button", { name: "Nova publicação" }).click();
  await expect(editor).toBeVisible();
  await expect(page.locator(".admin-list-panel")).toBeHidden();
  await page.getByRole("button", { name: "Voltar para a lista" }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator(".admin-list-panel")).toBeVisible();
});

test("drawer móvel abre, fecha e navega de forma previsível", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: "Abrir menu de administração" });
  const drawer = page.locator("#admin-navigation-drawer");

  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveClass(/is-open/);

  await page.keyboard.press("Escape");
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(menu).toBeFocused();

  await menu.click();
  await drawer.getByRole("link", { name: "Eventos" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard\/events$/);
  await expect(drawer).not.toHaveClass(/is-open/);
});
