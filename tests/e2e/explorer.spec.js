import { test, expect } from "@playwright/test";

async function openExplorer(page) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.getByTestId("explorer-workspace")).toBeVisible();
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByTestId("explore-mode-button")).toHaveAttribute("aria-pressed", "true");
}

test("explore mode lets users select evidence and discover computable values", async ({ page }) => {
  await openExplorer(page);

  const faqDrawer = page.locator(".explorer-page-help-drawer-faq");
  await expect(faqDrawer).toHaveCount(1);
  await faqDrawer.locator("summary").click();
  await expect(faqDrawer).toContainText("What are we simulating?");

  const gridCard = page.getByTestId("explorer-grid-card");
  await gridCard.scrollIntoViewIfNeeded();
  await expect(gridCard).toBeVisible();

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

  await expect(page.getByTestId("grid-marker-controls")).toContainText("Select evidence cells");
  await expect(page.getByTestId("explorer-workspace")).not.toContainText("Play");
  await expect(page.getByTestId("explorer-workspace")).not.toContainText("Learn");
  await expect(page.getByTestId("grid-to-graph-link")).toHaveAttribute("href", /mode=explore/);
  await expect(page.getByTestId("value-dock")).toContainText("Smart explorer");
  await expect(page.getByTestId("value-dock")).toContainText("Train A / Eval A");
  await expect(page.getByTestId("capability-panel")).toContainText("What this selection can compute");
  await expect(page.getByTestId("capability-panel")).toContainText("Leave-one-out");

  await page.getByRole("button", { name: /Show Shapley column/i }).click();
  await expect(page.getByTestId("capability-panel")).toContainText("Shapley can be computed");

  const displayControls = page.getByTestId("display-controls");
  await displayControls.locator("summary").click();
  await expect(page.getByLabel("Show raw values")).toBeChecked();
  await expect(page.getByLabel("Fewer cols")).not.toBeChecked();
  await page.getByLabel("Fewer cols").check();
  await expect(columnLabels).toHaveCount(3);
  await expect(columnLabels.nth(0)).toHaveText("A");
  await expect(columnLabels.nth(1)).toHaveText("B");

  await expect(page.getByTestId("metric-controls")).toContainText("Real data");
  await page.getByTestId("metric-select").selectOption("real");
  await expect(page.getByTestId("metric-controls")).toContainText("Precomputed");
  await expect(page.getByTestId("metric-controls")).toContainText("Live");
});

test("compute mode builds a query and walks through the required cells", async ({ page }) => {
  await openExplorer(page);

  await page.getByTestId("compute-mode-button").click();
  await expect(page.getByTestId("compute-mode-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("concept-select")).toHaveValue("loo");
  const questionControls = page.getByTestId("question-controls");
  await expect(questionControls).toContainText("Query");

  await page.getByTestId("grid-train-select").selectOption({ label: "ABC" });
  await page.getByTestId("grid-eval-select").selectOption({ label: "C" });
  await questionControls.getByRole("button", { name: "B" }).click();
  await expect(page.getByTestId("value-dock")).toContainText("Leave-one-out");
  await expect(page.getByTestId("reading-takeaway")).toContainText("f(ABC, C)");

  await page.getByRole("button", { name: "Start walkthrough" }).first().click();
  await expect(page.getByTestId("walkthrough-panel")).toContainText("Start with the anchor cell");
  await expect(page.locator('[data-testid="explorer-grid"] .cell-plan')).toHaveCount(2);

  await page.getByTestId("concept-select").selectOption("shapley");
  await expect(page.getByTestId("value-dock")).toContainText("Shapley value");
  await page.getByRole("button", { name: "Start walkthrough" }).first().click();
  await expect(page.getByTestId("walkthrough-panel")).toContainText("Pair worlds without and with B");

  await page.getByTestId("concept-select").selectOption("group");
  await expect(questionControls).toContainText("Focus coalition");
  await questionControls.getByRole("button", { name: "C" }).click();
  await expect(page.getByTestId("value-dock")).toContainText("Group leave-one-out");

  await page.getByTestId("concept-select").selectOption("interaction");
  await expect(page.getByTestId("value-dock")).toContainText("Pair interaction");
  await expect(page.getByTestId("reading-takeaway")).toContainText("f(ABC, C)");

  await page.getByTestId("concept-select").selectOption("eval-scaling");
  await expect(page.getByTestId("value-dock")).toContainText("Eval scaling");
  await expect(questionControls).toContainText("Subset size bucket");

  await page.getByTestId("concept-select").selectOption("budget");
  await expect(page.getByTestId("value-dock")).toContainText("Budgeted subset scan");
});

test("grid stays visible after the refactor on dense settings", async ({ page }) => {
  await openExplorer(page);

  await page.getByTestId("compute-mode-button").click();
  await page.getByTestId("concept-select").selectOption("scaling");
  await page.getByTestId("question-controls").getByRole("button", { name: "k=2" }).click();
  await expect(page.getByTestId("value-dock")).toContainText("Scaling law");

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
