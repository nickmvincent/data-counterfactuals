import { test, expect } from "@playwright/test";

test("quick primer presents a segmented visual introduction", async ({ page }) => {
  await page.goto("/story");

  const main = page.locator("main");

  await expect(page.getByRole("heading", { name: "A quick primer on data counterfactuals" })).toBeVisible();
  await expect(main.locator(".primer-kicker")).toContainText([
    "The baseline",
    "Row move",
    "Column move",
    "Rights and access",
  ]);
  await expect(page.getByRole("heading", { name: "After pretraining, the data path can become a pipeline." })).toBeVisible();
  await expect(page.locator(".primer-section")).toHaveCount(4);

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});

test("study further page is organized like a compact open textbook", async ({ page }) => {
  await page.goto("/learn");

  const main = page.locator("main");

  await expect(page.getByRole("heading", { name: "Study Further" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orientation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference Notes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suggested path" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paper trail" })).toBeVisible();
  await expect(page.getByText("If you have five minutes")).toBeVisible();
  await expect(main.locator('a[href="https://arxiv.org/abs/1904.02868"]')).toContainText("Data Shapley");
  await expect(main.locator('a.learn-item[href="/post-training"]')).toContainText("Stub");

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});
