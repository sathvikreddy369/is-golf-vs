import { expect, test } from "@playwright/test";

test("home page renders key CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Track scores, join monthly prize draws/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explore Partner Charities/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Browse Draw Results/i })).toBeVisible();
});

test("draws page is reachable", async ({ page }) => {
  await page.goto("/draws");
  await expect(page.getByRole("heading", { name: /Monthly Draw Results/i })).toBeVisible();
});

test("impact page is reachable", async ({ page }) => {
  await page.goto("/impact");
  await expect(page.getByRole("heading", { name: /Community Impact/i })).toBeVisible();
});

test("charities directory page is reachable", async ({ page }) => {
  await page.goto("/charities");
  await expect(page.getByRole("heading", { name: /Charity Directory/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Search/i })).toBeVisible();
});

test("login page renders auth forms", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Create Subscriber Account/i })).toBeVisible();
});

test("dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("admin redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
