import { test, expect } from "@playwright/test";

async function openExplorer(page) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.locator('[data-testid="explorer-workspace"][data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore" })).toBeVisible();
}

test("grid explorer defaults to explore mode and exposes lettered axis labels", async ({ page }) => {
  await openExplorer(page);

  const gridCard = page.getByTestId("explorer-grid-card");
  await gridCard.scrollIntoViewIfNeeded();
  await expect(gridCard).toBeVisible();
  const sideRail = page.getByTestId("grid-side-rail");
  await expect(sideRail).toBeVisible();

  const columnLabels = page.locator('[data-testid="explorer-grid"] .cl .axis-set');
  await expect(columnLabels.nth(0)).toHaveText("∅");
  await expect(columnLabels.nth(1)).toHaveText("A");
  await expect(columnLabels.nth(2)).toHaveText("B");

  const rowLabels = page.locator('[data-testid="explorer-grid"] .rl .axis-set');
  await expect(rowLabels.nth(0)).toHaveText("∅");
  await expect(rowLabels.nth(1)).toHaveText("A");

  const firstRowCells = page.locator('[data-testid="explorer-grid"] .rr').first().locator(".cell");
  const firstCellBox = await firstRowCells.nth(0).boundingBox();
  const secondCellBox = await firstRowCells.nth(1).boundingBox();
  expect(firstCellBox).not.toBeNull();
  expect(secondCellBox).not.toBeNull();
  expect(secondCellBox.x).toBeGreaterThan(firstCellBox.x + 20);
  expect(Math.abs(secondCellBox.y - firstCellBox.y)).toBeLessThan(5);

  const valueDock = page.getByTestId("value-dock");
  const questionControls = page.getByTestId("question-controls");
  await expect(valueDock.locator(".panel-title")).toHaveText("Read one train/eval cell");
  await expect(page.getByTestId("reading-takeaway")).toContainText("lands at");
  await expect(questionControls).toContainText("How to use this mode");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Choose target cell");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Click any cell to read it directly as one train/eval world pair");
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Any second cell makes sense");
  const gridBox = await gridCard.boundingBox();
  const sideRailBox = await sideRail.boundingBox();
  const valueDockBox = await valueDock.boundingBox();
  const questionControlsBox = await questionControls.boundingBox();
  expect(gridBox).not.toBeNull();
  expect(sideRailBox).not.toBeNull();
  expect(valueDockBox).not.toBeNull();
  expect(questionControlsBox).not.toBeNull();
  expect(sideRailBox.y).toBeGreaterThan(gridBox.y + gridBox.height - 12);
  expect(valueDockBox.x).toBeGreaterThan(questionControlsBox.x);
  expect(Math.abs(questionControlsBox.y - valueDockBox.y)).toBeLessThan(80);
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeEnabled();
  await page.getByTestId("grid-train-select").selectOption({ label: "ABC" });
  await page.getByTestId("grid-eval-select").selectOption({ label: "D" });
  await expect(valueDock).toContainText("Train ABC");
  await expect(valueDock).toContainText("Eval D");
  const looButton = page.getByRole("button", { name: "LOO", exact: true });
  await expect
    .poll(async () => {
      await looButton.click();
      return looButton.getAttribute("aria-pressed");
    })
    .toBe("true");
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Use built-in comparison" })).toBeVisible();
  await expect(page.getByTestId("grid-marker-controls")).toContainText("Most meaningful cells keep eval");
  await expect(page.getByTestId("question-controls")).toContainText("Focus contributor");
  await expect(gridCard).toContainText("Rows train");
  await expect(page.getByTestId("display-controls")).toContainText("Show raw values");
  await expect(page.getByTitle(/pointwise-additive metrics/i)).toBeVisible();
  await page.getByLabel("Show fewer eval cols").check();
  await expect(columnLabels).toHaveCount(4);
  await expect(columnLabels.nth(0)).toHaveText("A");
  await expect(columnLabels.nth(3)).toHaveText("D");
  await expect(page.getByTestId("metric-controls")).toContainText("Real data");
  await expect(page.getByTestId("metric-controls")).toContainText('toy proxy for "retrain on');
  await page.getByRole("button", { name: "Real data" }).click();
  await expect(page.getByTestId("metric-controls")).toContainText("Precomputed");
  await expect(page.getByTestId("metric-controls")).toContainText("Live");
  await page.getByRole("button", { name: "Shapley", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark comparison cell" })).toBeDisabled();
  await expect(page.getByTestId("grid-marker-controls")).toContainText("not as a primary control");
});

test("mode-specific scenes drive the explorer through a real user flow", async ({ page }) => {
  await openExplorer(page);

  await page.getByRole("button", { name: "Group LOO" }).click();
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

  expect(["visible", "clip"]).toContain(toolbarMetrics.overflowY);
  expect(toolbarMetrics.scrollHeight - toolbarMetrics.clientHeight).toBeLessThanOrEqual(2);

  await page.getByTestId("explorer-grid-card").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("explorer-grid-card")).toBeVisible();
});
