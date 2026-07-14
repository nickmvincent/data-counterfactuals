import { test, expect } from "@playwright/test";

test("quick primer presents a segmented visual introduction", async ({ page }) => {
  await page.goto("/story");

  const main = page.locator("main");

  await expect(page.getByRole("heading", { name: "A quick primer on data counterfactuals" })).toBeVisible();
  await expect(main.locator('header a[href="/learn"]')).toContainText("Follow the learning path");
  await expect(main.locator('header a[href="/examples"]')).toContainText("See a worked case");
  await expect(main.locator(".primer-kicker")).toContainText([
    "The baseline",
    "Row move",
    "Column move",
    "Rights and access",
  ]);
  await expect(page.getByRole("heading", { name: "After pretraining, the data path can become a pipeline." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write the comparison before moving on." })).toBeVisible();
  await expect(page.locator(".primer-completion dt")).toContainText([
    "Reference world",
    "Intervention",
    "Held fixed",
    "Unsupported conclusion",
  ]);
  await expect(page.locator(".course-nav")).toContainText("Module 01 of 6");
  await expect(page.locator('.course-nav a[href="/examples#source-removal"]')).toContainText("Training-data effects");
  await expect(page.locator(".primer-section")).toHaveCount(4);

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});

test("learn page presents a six-part route from orientation to institutions", async ({ page }) => {
  await page.goto("/learn");

  const main = page.locator("main");

  await expect(page.getByRole("heading", { name: "Learn to compare data worlds." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Name the two worlds." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From one contrast to the neighboring fields." })).toBeVisible();
  await expect(page.locator(".learn-module-link")).toHaveCount(6);
  await expect(page.locator(".learn-module-facts dt")).toHaveCount(18);
  await expect(page.locator(".learn-module-facts dt")).toContainText(["Goal", "Output", "Check"]);
  await expect(page.getByRole("heading", { name: "Nearby data worlds" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evaluation and evidence" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access, institutions, and power" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Four checks, every time." })).toBeVisible();
  await expect(page.getByText("State one tempting conclusion")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Branch into the primary sources." })).toBeVisible();
  await expect(main.locator('a[href="https://proceedings.mlr.press/v97/ghorbani19c.html"]')).toContainText("Data Shapley");

  const metrics = await page.locator("body").evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(metrics.overflowX).toBe(0);
});
