import { test, expect } from "@playwright/test";

test("the Reading Map can switch between alphabetical and framing order", async ({
  page,
}) => {
  await page.goto("/collections");
  await expect(page.getByRole("heading", { name: "Reading Map" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Semble ↗" })).toHaveAttribute(
    "href",
    "https://semble.so/profile/nickmvincent.bsky.social",
  );

  const headings = await page.locator(".reading-collection h2").allTextContents();
  const sorted = [...headings].sort((left, right) => left.localeCompare(right));
  expect(headings).toEqual(sorted);
  expect(headings.length).toBeGreaterThan(10);

  const orderSelect = page.getByLabel("Order collections");
  await expect(orderSelect).toHaveValue("alphabetical");
  await orderSelect.selectOption("counterfactual");
  await expect(page.locator(".reading-collection h2").first()).toHaveText(
    "collective action",
  );
  await expect(page.locator(".collection-index li a").first()).toHaveText(
    "collective action",
  );

  await orderSelect.selectOption("alphabetical");
  await expect(page.locator(".reading-collection h2").first()).toHaveText(
    "active learning",
  );

  const expandable = page.locator(".remaining-papers summary").first();
  await expect(expandable).toBeVisible();
  await expandable.click();
  await expect(expandable.locator("xpath=..")).toHaveAttribute("open", "");
});

test("the Reading Map cleans collection copy and broken OpenReview metadata", async ({
  page,
}) => {
  await page.goto("/collections");
  await expect(page.getByText("Semble collection index")).toHaveCount(0);
  await expect(
    page.getByText("Part of the datacounterfactuals.org reading lists.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(page.getByText("A list of starting points, not exhaustive.")).toBeVisible();
  await expect(page.getByText("Verifying your browser | OpenReview")).toHaveCount(0);
  await expect(page.getByText("Client Challenge")).toHaveCount(0);
  await expect(page.locator('.paper-list a[href*="openreview.net"]')).toHaveCount(0);

  await expect(
    page.getByRole("link", {
      name: "Deep Batch Active Learning by Diverse, Uncertain Gradient Lower Bounds",
    }),
  ).toHaveAttribute("href", /scholar\.google\.com/);
});

test("the Reading Map remains functional at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/collections");
  await expect(page.getByRole("heading", { name: "Reading Map" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
