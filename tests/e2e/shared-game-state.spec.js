import { test, expect } from "@playwright/test";

test("grid and graph keep the same game state through view switches", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4321" });
  await page.goto("/grid?count=3&metric=inter&mode=eval&train=ABC&eval=C&focus=B&k=1");
  await expect(page.locator('.workspace-shell[data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("mode-dialog-button")).toContainText("Eval");
  await expect(page.getByTestId("concept-select")).toHaveValue("eval");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("ABC");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("C");
  await page.getByTestId("grid-share-link").click();
  await expect(page.getByTestId("grid-share-link")).toHaveText("Copied");
  const copiedGridUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedGridUrl).toContain("/grid?count=3&metric=inter&mode=eval&lens=ablation&train=ABC&eval=C&focus=B&k=1");

  const graphLink = page.getByTestId("grid-to-graph-link");
  await expect(graphLink).toHaveAttribute("href", /\/graph\?/);
  await expect(graphLink).toHaveAttribute("href", /train=ABC/);
  await expect(graphLink).toHaveAttribute("href", /eval=C/);

  await graphLink.click();
  await expect(page).toHaveURL(/\/graph\?/);
  await expect(page.locator('.graph-workspace[data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("graph-count-value")).toHaveText("3 datasets");
  await expect(page.getByTestId("graph-pill-metric")).toHaveText("|Intersection|");
  await expect(page.getByTestId("graph-selected-train")).toHaveText("ABC");
  await expect(page.getByTestId("graph-selected-eval")).toHaveText("C");
  await expect(page.getByTestId("graph-lens-panel")).toContainText("Ablation delta");
  await page.getByTestId("graph-share-link").click();
  await expect(page.getByTestId("graph-share-link")).toHaveText("Copied");
  const copiedGraphUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedGraphUrl).toContain("/graph?count=3&metric=inter&mode=eval&lens=ablation&train=ABC&eval=C&focus=B&k=1");

  const gridLink = page.getByTestId("graph-to-grid-link");
  await expect(gridLink).toHaveAttribute("href", /mode=eval/);
  await gridLink.click();
  await expect(page).toHaveURL(/\/grid\?/);
  await expect(page.locator('.workspace-shell[data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("mode-dialog-button")).toContainText("Eval");
  await expect(page.getByTestId("concept-select")).toHaveValue("eval");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("ABC");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("C");
});
