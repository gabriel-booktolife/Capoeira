import { expect, test } from "@playwright/test";

test("home institucional é responsiva e não expõe o painel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Chão Batido", exact: true })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: /admin/i })).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("overflow-x", "hidden");
});

test("login oferece recuperação de senha", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Painel do grupo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Esqueci minha senha" })).toBeVisible();
});
