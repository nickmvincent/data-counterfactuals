import { test, expect } from "@playwright/test";

async function expectPageToStayNearTop(page, path, ready) {
  await page.goto(path);
  await expect(ready).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(20);
}

test("grid page does not auto scroll on load", async ({ page }) => {
  await expectPageToStayNearTop(page, "/grid", page.getByTestId("explorer-grid"));
});

test("graph page does not auto scroll on load", async ({ page }) => {
  await expectPageToStayNearTop(page, "/graph", page.getByTestId("explorer-graph"));
});
