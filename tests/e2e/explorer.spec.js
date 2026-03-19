import { test, expect } from "@playwright/test";

async function openExplorer(page) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.getByTestId("explorer-workspace")).toBeVisible();
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByTestId("concept-select")).toBeVisible();
  await expect(page.getByTestId("concept-select")).toHaveValue("explore");
}

test("grid explorer defaults to explore mode and exposes lettered axis labels", async ({ page }) => {
  await openExplorer(page);

  const gridCard = page.getByTestId("explorer-grid-card");
  await gridCard.scrollIntoViewIfNeeded();
  await expect(gridCard).toBeVisible();
  const sideRail = page.getByTestId("grid-side-rail");
  await expect(sideRail).toBeVisible();

  const columnLabels = page.locator('[data-testid="explorer-grid"] .cl .axis-set');
  await expect(columnLabels).toHaveCount(8);
  await expect(columnLabels.nth(0)).toHaveText("∅");
  await expect(columnLabels.nth(1)).toHaveText("A");
  await expect(columnLabels.nth(2)).toHaveText("B");
  await expect(columnLabels.nth(3)).toHaveText("C");

  const rowLabels = page.locator('[data-testid="explorer-grid"] .rl .axis-set');
  await expect(rowLabels.nth(0)).toHaveText("∅");
  await expect(rowLabels.nth(1)).toHaveText("A");
  await expect(page.locator('[data-testid="explorer-grid"] .num').first()).toBeVisible();

  const firstRowCells = page.locator('[data-testid="explorer-grid"] .rr').first().locator(".cell");
  const firstCellBox = await firstRowCells.nth(0).boundingBox();
  const secondCellBox = await firstRowCells.nth(1).boundingBox();
  expect(firstCellBox).not.toBeNull();
  expect(secondCellBox).not.toBeNull();
  expect(secondCellBox.x).toBeGreaterThan(firstCellBox.x + 20);
  expect(Math.abs(secondCellBox.y - firstCellBox.y)).toBeLessThan(5);

  const valueDock = page.getByTestId("value-dock");
  const questionControls = page.getByTestId("question-controls");
  const explorerGrid = page.getByTestId("explorer-grid");
  await expect(valueDock.locator(".panel-title")).toHaveText("Read one train/eval cell");
  await expect(page.getByTestId("reading-takeaway")).toContainText("lands at");
  await expect(questionControls).toContainText("How to use this mode");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Choose target cell");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Click any cell to read it directly as one train/eval world pair");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Any second cell makes sense");
  const gridBox = await gridCard.boundingBox();
  const explorerGridBox = await explorerGrid.boundingBox();
  const sideRailBox = await sideRail.boundingBox();
  const valueDockBox = await valueDock.boundingBox();
  const questionControlsBox = await questionControls.boundingBox();
  expect(gridBox).not.toBeNull();
  expect(explorerGridBox).not.toBeNull();
  expect(sideRailBox).not.toBeNull();
  expect(valueDockBox).not.toBeNull();
  expect(questionControlsBox).not.toBeNull();
  expect(sideRailBox.x).toBeGreaterThan(explorerGridBox.x + explorerGridBox.width - 12);
  expect(Math.abs(sideRailBox.y - explorerGridBox.y)).toBeLessThan(80);
  expect(Math.abs(questionControlsBox.x - valueDockBox.x)).toBeLessThan(48);
  expect(questionControlsBox.y).toBeGreaterThan(valueDockBox.y);
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeEnabled();
  await page.getByTestId("grid-train-select").selectOption({ label: "ABC" });
  await page.getByTestId("grid-eval-select").selectOption({ label: "C" });
  await expect(valueDock).toContainText("Train ABC");
  await expect(valueDock).toContainText("Eval C");
  await page.getByTestId("concept-select").selectOption("loo");
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Use built-in comparison" })).toBeVisible();
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Most meaningful cells keep eval");
  await expect(page.getByTestId("question-controls")).toContainText("Focus contributor");
  await expect(gridCard).toContainText("Rows train");
  const displayControls = page.getByTestId("display-controls");
  await displayControls.locator("summary").click();
  await expect(page.getByLabel("Show raw values")).toBeChecked();
  await expect(page.getByLabel("Fewer cols")).not.toBeChecked();
  await page.getByLabel("Fewer cols").check();
  await expect(columnLabels).toHaveCount(3);
  await expect(columnLabels.nth(0)).toHaveText("A");
  await expect(columnLabels.nth(1)).toHaveText("B");
  await expect(page.getByTestId("metric-controls")).toContainText("Real data");
  await page.getByTestId("metric-help").locator("summary").click();
  await expect(page.getByTestId("metric-help")).toContainText('toy proxy for "retrain on');
  await page.getByTestId("metric-select").selectOption("real");
  await expect(page.getByTestId("metric-controls")).toContainText("Precomputed");
  await expect(page.getByTestId("metric-controls")).toContainText("Live");
  await page.getByTestId("concept-select").selectOption("shapley");
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeDisabled();
  await expect(page.getByTestId("grid-marker-controls")).toContainText("not as a primary control");
});

test("mode-specific scenes drive the explorer through a real user flow", async ({ page }) => {
  await openExplorer(page);

  await page.getByTestId("concept-select").selectOption("group");
  await expect(page.getByTestId("concept-select")).toHaveValue("group");
  await expect(page.getByTestId("question-controls")).toContainText("Focus coalition");
  const presets = page.getByTestId("scene-controls");
  await presets.locator("summary").click();
  await expect(presets).toContainText("Strike with C and D");
  await page.getByRole("button", { name: /Strike with C and D/i }).click();

  const valueDock = page.getByTestId("value-dock");
  await expect(valueDock.locator(".panel-title")).toHaveText("Remove a group together");
  await expect(valueDock).toContainText("group CD walked out");
  await expect(valueDock).toContainText("Focus CD");
  await expect(valueDock).toContainText("Train ABCD");
  await expect(valueDock).toContainText("Eval ABCD");
});

test("poison mode adds operator-layer controls and still keeps the grid visible", async ({ page }) => {
  await openExplorer(page);

  await page.getByTestId("concept-select").selectOption("poison");

  await expect(page.getByTestId("world-layer-controls")).toBeVisible();
  await expect(page.getByTestId("question-controls")).toContainText("Attack controls");
  await expect(page.getByTestId("display-controls")).toBeVisible();

  await page.getByTestId("display-controls").locator("summary").click();
  await page.getByLabel("Show raw values").check();
  await page.getByLabel(/Corrupt rows containing A/i).check();
  await expect(page.locator('[data-testid="explorer-grid"] .num').first()).toBeVisible();

  const toolbarMetrics = await page.getByTestId("explorer-toolbar").evaluate((node) => ({
    clientHeight: node.clientHeight,
    overflowY: getComputedStyle(node).overflowY,
    scrollHeight: node.scrollHeight,
  }));

  expect(["visible", "clip"]).toContain(toolbarMetrics.overflowY);
  expect(toolbarMetrics.scrollHeight - toolbarMetrics.clientHeight).toBeLessThanOrEqual(2);

  await page.getByTestId("explorer-grid-card").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("explorer-grid-card")).toBeVisible();
});
