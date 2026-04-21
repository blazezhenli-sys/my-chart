import { expect, test } from "@playwright/test";

test("register -> create cycle -> dashboard renders", async ({ page }) => {
  await page.goto("/register");

  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("very-secure-password");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByText("Welcome to your NFP dashboard")).toBeVisible();
  await page.getByLabel("Cycle start date").fill("2026-03-01");
  await page.getByRole("button", { name: /create active cycle/i }).click();

  await expect(page.getByText("Quick daily entry")).toBeVisible();
});
