import { test, expect } from "@playwright/test";

test("research gateway makes the shared scaffold and differences explicit", async ({ page }) => {
  await page.goto("/research");

  await expect(page.getByRole("heading", { name: "Same scaffold. Different estimands." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A ladder of increasingly strong claims." })).toBeVisible();
  await expect(page.locator(".research-level")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Line up the reference worlds." })).toBeVisible();
  await expect(page.locator(".research-table tbody tr")).toHaveCount(8);
  await expect(page.getByRole("link", { name: "Differential privacy" })).toHaveAttribute("href", "/methods#privacy");
  await expect(page.getByRole("heading", { name: "Which evidence can travel?" })).toBeVisible();
  await expect(page.locator(".research-reuse-list li")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Test whether the connection does useful work." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From dependence to strategic leverage." })).toBeVisible();
  await expect(page.locator(".research-strategy-list li")).toHaveCount(5);
  await expect(page.getByText("Draft synthesis")).toBeVisible();

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});

test("cases and labs gateway separates the recommended route from prototypes", async ({ page }) => {
  await page.goto("/labs");

  await expect(page.getByRole("heading", { name: "Examples before controls." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question first. Instrument second." })).toBeVisible();
  await expect(page.locator(".labs-route-link")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Move from case to working brief." })).toBeVisible();
  await expect(page.locator(".labs-tool")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Keep the prototypes, label their status." })).toBeVisible();
  await expect(page.locator(".labs-experimental-link")).toHaveCount(4);
  await expect(page.getByText("Interpretation rule: every move should name the intervention")).toBeVisible();

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});
