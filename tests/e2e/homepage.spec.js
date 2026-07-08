import { test, expect } from "@playwright/test";

test("homepage presents the story and learning-lab paths", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Data Counterfactuals" })).toBeVisible();
  await expect(page.getByText("How do AI models change if upstream data changes?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Two ways in" })).toHaveCount(0);
  await expect(page.getByTestId("home-path-story")).toContainText("Quick primer");
  await expect(page.getByTestId("home-path-story")).toContainText("An introduction to the data counterfactuals idea");
  await expect(page.getByTestId("home-path-learn")).toContainText("Study further");
  await expect(page.getByTestId("home-path-learn")).toContainText("Interactive and text materials");
  await expect(page.getByTestId("home-path-story")).toHaveAttribute("href", "/story");
  await expect(page.getByTestId("home-path-learn")).toHaveAttribute("href", "/learn");
  await expect(page.getByText("A central metaphor here is the grid.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "More starting points" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Human feedback value");

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
