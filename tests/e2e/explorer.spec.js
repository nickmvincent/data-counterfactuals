import { test, expect } from "@playwright/test";

async function openExplorer(page) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore" })).toBeVisible();
}

test("grid explorer defaults to explore mode and exposes lettered axis labels", async ({ page }) => {
  await openExplorer(page);

  const gridCard = page.getByTestId("explorer-grid-card");
  await gridCard.scrollIntoViewIfNeeded();
  await expect(gridCard).toBeVisible();

  const columnLabels = page.locator('[data-testid="explorer-grid"] .cl .axis-set');
  await expect(columnLabels.nth(0)).toHaveText("∅");
  await expect(columnLabels.nth(1)).toHaveText("A");
  await expect(columnLabels.nth(2)).toHaveText("B");

  const rowLabels = page.locator('[data-testid="explorer-grid"] .rl .axis-set');
  await expect(rowLabels.nth(0)).toHaveText("∅");
  await expect(rowLabels.nth(1)).toHaveText("A");

  await expect(page.getByTestId("value-dock").locator(".panel-title")).toHaveText("Read one train/eval cell");
  await expect(page.getByTestId("question-controls")).toContainText("How to use this mode");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Choose the data point we're going to value");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Click any cell to read it directly as one train/eval world pair");
  await expect(page.getByRole("button", { name: "Choose point to compare" })).toBeDisabled();
  await page.getByRole("button", { name: "LOO", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose point to compare" })).toBeEnabled();
  await expect(page.getByTestId("question-controls")).toContainText("Focus contributor");
  await expect(gridCard).toContainText("Rows train");
  await expect(page.getByTestId("display-controls")).toContainText("Show raw values");
  await expect(page.getByTestId("metric-controls")).toContainText('toy proxy for "retrain on');
});

test("mode-specific scenes drive the explorer through a real user flow", async ({ page }) => {
  await openExplorer(page);

  await page.getByRole("button", { name: "Group LOO" }).click();
  const presets = page.getByTestId("scene-controls");
  await expect(presets).toContainText("Strike with C and D");
  await page.getByRole("button", { name: /Strike with C and D/i }).click();

  const valueDock = page.getByTestId("value-dock");
  await expect(valueDock.locator(".panel-title")).toHaveText("Remove a group together");
  await expect(valueDock).toContainText("group CD walked out");
  await expect(valueDock).toContainText("Focus CD");
  await expect(page.getByTestId("explorer-grid-card")).toContainText("Train ABCD");
  await expect(page.getByTestId("explorer-grid-card")).toContainText("Eval ABCD");
});

test("poison mode adds operator-layer controls and still keeps the grid visible", async ({ page }) => {
  await openExplorer(page);

  await page.getByRole("button", { name: "Poison" }).click();

  await expect(page.getByTestId("world-layer-controls")).toBeVisible();
  await expect(page.getByTestId("question-controls")).toContainText("Attack controls");
  await expect(page.getByTestId("display-controls")).toBeVisible();

  await page.getByLabel("Show raw values").check();
  await page.getByLabel(/Corrupt rows containing A/i).check();
  await expect(page.locator('[data-testid="explorer-grid"] .num').first()).toBeVisible();

  const toolbarMetrics = await page.getByTestId("explorer-toolbar").evaluate((node) => ({
    clientHeight: node.clientHeight,
    overflowY: getComputedStyle(node).overflowY,
    scrollHeight: node.scrollHeight,
  }));

  expect(toolbarMetrics.overflowY).toBe("visible");
  expect(toolbarMetrics.scrollHeight - toolbarMetrics.clientHeight).toBeLessThanOrEqual(2);

  await page.getByTestId("explorer-grid-card").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("explorer-grid-card")).toBeVisible();
});
