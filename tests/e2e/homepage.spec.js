import { test, expect } from "@playwright/test";

test("homepage presents audience-first paths and an evidence-qualified comparison", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Change the data. What changes downstream?" })).toBeVisible();
  await expect(page.getByText("Compare nearby training, evaluation, and governance worlds")).toBeVisible();
  await expect(page.locator('a.home-audience-path[href="/learn"]')).toContainText("Learn the comparison");
  await expect(page.locator('a.home-audience-path[href="/research"]')).toContainText("Inspect the connections");
  await expect(page.getByRole("heading", { name: "Compare two worlds, carefully." })).toBeVisible();
  await expect(page.getByText("Illustrative contrast: −0.09")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask what is actually changing." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The training outcome may change." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The comparison exposes the differences." })).toBeVisible();
  await expect(page.locator('a.home-path[href="/frame"]')).toContainText("Frame a study");
  await expect(page.locator('a.home-path[href="/labs"]')).toContainText("Work before abstracting");
  await expect(page.locator('a.home-path[href="/teach"]')).toContainText("Teach the contrast");
  await expect(page.getByRole("heading", { name: "Leave with something usable." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with the primary sources." })).toBeVisible();
  await expect(page.locator(".home-hero-copy > .action-row a")).toHaveCount(1);
  await expect(page.locator('.home-hero-copy > .action-row a[href="/frame"]')).toHaveText("Frame a study");

  const metrics = await page.locator("body").evaluate(() => {
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  expect(metrics.overflowX).toBe(0);
});

test("launch memo remains available with embedded examples and math", async ({ page }) => {
  await page.goto("/memo/data-counterfactuals");

  const title = page.locator(".memo-page .page-title");
  await expect(title).toHaveText("1. Introducing Data Counterfactuals");
  await expect(page.getByText("Post-training human feedback counterfactuals")).toBeVisible();
  await expect(page.getByText("Leave-one-out toy example")).toBeVisible();
  await expect(page.locator("[data-memo-example='toy-grid']")).toBeVisible();
  await expect(page.locator(".katex-display")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("$$");
  await expect(page.locator("body")).not.toContainText("$G$");
  await expect(page.locator("body")).not.toContainText("{{< memo-example");
});
