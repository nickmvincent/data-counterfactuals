import { test, expect } from "@playwright/test";

test("homepage renders memo one with embedded examples and math", async ({ page }) => {
  await page.goto("/");

  const title = page.locator(".memo-page .page-title");
  await expect(title).toHaveText("1. Introducing Data Counterfactuals");
  await expect(page.getByText("Leave-one-out toy example")).toBeVisible();
  await expect(page.locator("[data-memo-example='toy-grid']")).toBeVisible();
  await expect(page.locator(".katex-display")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("$$");
  await expect(page.locator("body")).not.toContainText("$G$");
  await expect(page.locator("body")).not.toContainText("{{< memo-example");

  const metrics = await title.evaluate(() => {
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  expect(metrics.overflowX).toBe(0);
});
