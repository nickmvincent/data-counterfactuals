import { test, expect } from "@playwright/test";

test("homepage keeps the textbook title block and renders math", async ({ page }) => {
  await page.goto("/");

  const title = page.locator(".start-intro .page-title");
  await expect(title).toHaveText("Data Counterfactuals");
  await expect(page.locator(".katex-display")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("$$");
  await expect(page.locator("body")).not.toContainText("$G$");

  const metrics = await title.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      titleHeight: rect.height,
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  expect(metrics.titleHeight).toBeLessThan(96);
  expect(metrics.overflowX).toBe(0);
});
