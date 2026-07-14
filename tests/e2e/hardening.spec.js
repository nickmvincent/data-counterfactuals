import { test, expect } from "@playwright/test";

test("question framer keeps intervention grammar and role guidance precise", async ({ page }) => {
  await page.goto("/frame");
  await expect(page.locator(".frame-tool")).toHaveAttribute("data-ready", "true");

  await page.getByLabel("2. What is the unit?").selectOption("population");
  await page.getByLabel("3. What happens to it?").selectOption("relicense");

  await expect(page.getByRole("heading", { name: "Change access terms for a contributor population" })).toBeVisible();
  await expect(page.getByText("Changing access terms is usually an access-and-governance intervention.")).toBeVisible();
  await expect(page.locator(".frame-question")).toContainText("when we change access terms for a contributor population");

  await page.locator('label.frame-choice:has(input[value="access"])').click();
  await expect(page.locator(".frame-compatibility")).toHaveCount(0);
});

test("mobile navigation and research comparison fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/research");

  await page.locator(".nav-mobile-toggle").click();
  const panel = page.locator(".nav-mobile-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator(":scope > .nav-mobile-section .nav-mobile-link")).toHaveCount(6);
  await expect(panel.getByText("Primer and reference", { exact: true })).toBeVisible();
  await expect(panel.getByText("Experimental tools", { exact: true })).toBeVisible();

  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox.height).toBeLessThanOrEqual(844 - 80);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(844);

  await page.locator(".nav-mobile-toggle").click();
  await expect(page.locator(".research-crosswalk-wrap")).toBeHidden();
  await expect(page.locator(".research-crosswalk-card")).toHaveCount(8);
  await expect(page.locator(".research-crosswalk-cards")).toBeVisible();

  const overflowX = await page.locator("body").evaluate(
    () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  expect(overflowX).toBe(0);
});

test("course modules preserve previous and next context", async ({ page }) => {
  await page.goto("/examples#source-removal");

  const module = page.locator("#source-removal .course-nav");
  await expect(module).toContainText("Module 02 of 6");
  await expect(module.locator('a[href="/story"]')).toContainText("Nearby data worlds");
  await expect(module.locator('a[href="/methods#semivalues"]')).toContainText("Aggregation and value");
});
