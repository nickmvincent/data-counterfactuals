import { test, expect } from "@playwright/test";

async function closeSetupIfPresent(page) {
  const setup = page.getByTestId("game-setup-modal");
  try {
    await setup.waitFor({ state: "visible", timeout: 800 });
    await setup.getByTestId("setup-keep-current").click();
    await expect(setup).toHaveCount(0);
  } catch {
    // Shared-state links skip the starter modal.
  }
}

async function openMoveControls(page) {
  const controls = page.getByTestId("move-controls");
  await controls.getByText("Move controls").click();
  await expect(controls).toHaveAttribute("open", "");
}

async function chooseComputeMode(page) {
  await page.getByTestId("mode-dialog-button").click();
  const modeDialog = page.getByTestId("mode-dialog");
  await expect(modeDialog).toContainText("Decide what clicks mean");
  await modeDialog.getByTestId("compute-mode-button").click();
  await expect(modeDialog).toHaveCount(0);
  await expect(page.getByTestId("mode-dialog-button")).not.toContainText("Explore");
}

async function openExplorer(page, { controls = true } = {}) {
  await page.goto("/grid");
  await expect(page.getByTestId("explorer-toolbar")).toBeVisible();
  await expect(page.getByTestId("explorer-workspace")).toBeVisible();
  await expect(page.locator('.workspace-shell[data-ready="true"]')).toBeVisible();
  await closeSetupIfPresent(page);
  await expect(page.getByTestId("explorer-grid")).toBeVisible();
  await expect(page.getByTestId("mode-dialog-button")).toContainText("Explore");
  if (controls) await openMoveControls(page);
}

test("default explorer keeps the board near the first viewport", async ({ page }) => {
  await page.goto("/grid");
  await expect(page.locator('.workspace-shell[data-ready="true"]')).toBeVisible();
  const setup = page.getByTestId("game-setup-modal");
  await expect(setup).toContainText("Choose a starting position");
  await expect(setup).toContainText("Each square is a counterfactual world");
  await setup.getByTestId("setup-starter-grid").click();
  await expect(setup).toHaveCount(0);

  await expect(page.getByTestId("move-controls")).not.toHaveAttribute("open", "");
  const boardTop = await page.getByTestId("explorer-grid-card").evaluate((node) => node.getBoundingClientRect().top);
  expect(boardTop).toBeLessThan(380);
});

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
  await expect(page.locator('[data-testid="explorer-grid"] .cell-ci').first()).toBeVisible();

  await expect(page.getByTestId("grid-marker-controls")).toContainText("Build the active set");
  await expect(page.getByTestId("explorer-workspace")).not.toContainText("Play");
  await expect(page.getByTestId("explorer-workspace")).not.toContainText("Learn");
  await expect(page.getByTestId("grid-to-graph-link")).toHaveAttribute("href", /mode=explore/);
  await expect(page.getByTestId("value-dock")).toContainText("Smart explorer");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("Train");
  await expect(page.getByTestId("explorer-toolbar")).toContainText("Eval");
  await expect(page.getByTestId("capability-panel")).toContainText("What this active set can compute");
  await expect(page.getByTestId("capability-panel")).toContainText("Leave-one-out");

  await page.getByTestId("guides-open-button").click();
  const guides = page.getByTestId("guide-modal");
  await expect(guides).toContainText("Read eval CI bands");
  await expect(guides.getByTestId("guide-option")).toHaveCount(4);
  await guides.getByRole("button", { name: "Close" }).click();

  await page.getByTestId("atlas-open-button").click();
  const atlas = page.getByTestId("concept-atlas");
  await expect(atlas).toContainText("Baseline exploration");
  await expect(atlas).toContainText("Shapley value vs influence functions");
  await atlas.locator(".atlas-nav").getByRole("button", { name: /Differential privacy/ }).click();
  await expect(atlas).toContainText("not a DP proof");
  await expect(atlas).toContainText("Differential privacy vs unlearning");
  await atlas.getByRole("button", { name: "Close" }).click();
  await expect(atlas).toHaveCount(0);

  const sceneControls = page.getByTestId("scene-controls");
  await sceneControls.getByTestId("preset-select").selectOption("shapley");
  await sceneControls.getByRole("button", { name: "Show" }).click();
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
  await expect(displayControls).toContainText("Precomputed");
  await expect(displayControls).toContainText("Live");
  await expect(page.getByLabel("Show eval CI")).toBeChecked();
  await page.getByLabel("Show eval CI").uncheck();
  await expect(page.locator('[data-testid="explorer-grid"] .cell-ci')).toHaveCount(0);
  await page.getByLabel("Show eval CI").check();
  await expect(page.locator('[data-testid="explorer-grid"] .cell-ci').first()).toBeVisible();
});

test("guided mode teaches a route without cluttering explore mode after exit", async ({ page }) => {
  await openExplorer(page, { controls: false });

  await expect(page.getByTestId("guided-mode-shell")).toHaveCount(0);
  await page.getByTestId("guides-open-button").click();
  const guides = page.getByTestId("guide-modal");
  await expect(guides).toContainText("Pick one route");
  await guides.getByTestId("run-guide-button").click();

  const shell = page.getByTestId("guided-mode-shell");
  await expect(shell).toBeVisible();
  await expect(shell).toContainText("Guided mode");
  await expect(shell).toContainText("What changed");
  await expect(page.locator('[data-testid="explorer-grid"] .cell-guide-target')).toHaveCount(1);

  await page.locator('[data-testid="explorer-grid"] .cell-guide-target').click();
  await expect(page.getByTestId("guide-result")).toContainText("scores");
  await expect(shell).toContainText("2/");

  await shell.getByTestId("guide-exit-button").click();
  await expect(page.getByTestId("guided-mode-shell")).toHaveCount(0);
  await expect(page.locator('[data-testid="explorer-grid"] .cell-guide-target')).toHaveCount(0);
  await expect(page.getByTestId("mode-dialog-button")).toContainText("Explore");
  await expect(page.getByTestId("move-controls")).not.toHaveAttribute("open", "");
});

test("compute mode builds a query and walks through the required cells", async ({ page }) => {
  await openExplorer(page);

  await chooseComputeMode(page);
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

  await chooseComputeMode(page);
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
