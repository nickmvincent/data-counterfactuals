import { test, expect } from "@playwright/test";

async function openExplorer(page) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Simple" })).toBeVisible();
}

test("grid-first explorer keeps the matrix in view and exposes lettered axis labels", async ({ page }) => {
  await openExplorer(page);

  const viewport = page.viewportSize();
  const gridCard = page.getByTestId("explorer-grid-card");
  const gridCardBox = await gridCard.boundingBox();

  expect(gridCardBox).not.toBeNull();
  expect(gridCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewport.height);

  const columnLabels = page.locator('[data-testid="explorer-grid"] .cl .axis-set');
  await expect(columnLabels.nth(0)).toHaveText("∅");
  await expect(columnLabels.nth(1)).toHaveText("A");
  await expect(columnLabels.nth(2)).toHaveText("B");

  const rowLabels = page.locator('[data-testid="explorer-grid"] .rl .axis-set');
  await expect(rowLabels.nth(0)).toHaveText("∅");
  await expect(rowLabels.nth(1)).toHaveText("A");

  await expect(page.getByTestId("explorer-toolbar")).not.toContainText("How to read this grid");
  await expect(page.getByTestId("question-controls")).toContainText("Question target");
  await expect(page.getByTestId("question-controls")).toContainText("selected train row stays");
  await expect(gridCard).toContainText("source worlds used in the marginal comparisons");
  await expect(page.getByTestId("scene-controls")).toContainText('toy proxy for "retrain on');
});

test("presets drive the explorer through a real user flow", async ({ page }) => {
  await openExplorer(page);

  const presets = page.getByTestId("explorer-presets");
  await presets.locator("summary").click();
  await page.getByRole("button", { name: /Strike with C and D/i }).click();

  const activeQuestion = page.getByTestId("explorer-active-question");
  await expect(activeQuestion.locator(".toolbar-summary-title")).toHaveText("Remove a group together");

  await activeQuestion.locator("summary").click();
  await expect(activeQuestion.locator(".toolbar-question-line")).toContainText("group CD walked out");
  await expect(activeQuestion.locator(".scene-fact").filter({ hasText: "Focus" })).toContainText("CD");
  await expect(page.getByTestId("explorer-grid-card")).toContainText("Train ABCD");
  await expect(page.getByTestId("explorer-grid-card")).toContainText("Eval ABCD");
});

test("advanced mode extends the top bar and still keeps the grid visible", async ({ page }) => {
  await openExplorer(page);

  await page.getByRole("button", { name: "Advanced" }).click();

  await expect(page.getByTestId("world-layer-controls")).toBeVisible();
  await expect(page.getByTestId("toy-edit-controls")).toBeVisible();
  await expect(page.getByTestId("display-controls")).toBeVisible();

  await page.getByLabel("Show cell values").check();
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
