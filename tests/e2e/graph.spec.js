import { test, expect } from "@playwright/test";

async function openGraph(page) {
  await page.goto("/graph");
  await expect(page.getByTestId("graph-explorer-toolbar")).toBeVisible();
  await expect(page.locator('.graph-workspace[data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("explorer-graph")).toBeVisible();
}

test("graph explorer buttons drive core train/eval navigation", async ({ page }) => {
  await openGraph(page);

  const countValue = page.getByTestId("graph-count-value");
  const trainValue = page.getByTestId("graph-selected-train");
  const evalValue = page.getByTestId("graph-selected-eval");
  const scoreValue = page.getByTestId("graph-selected-score");
  const quickActions = page.getByTestId("graph-quick-actions");

  await expect(countValue).toHaveText("4 datasets");
  await page.getByTestId("graph-count-increase").click();
  await expect(countValue).toHaveText("5 datasets");
  await page.getByTestId("graph-count-decrease").click();
  await expect(countValue).toHaveText("4 datasets");

  await page.getByRole("button", { name: "|Intersection|" }).click();
  await expect(page.getByTestId("graph-pill-metric")).toHaveText("|Intersection|");
  await expect(scoreValue).toHaveText("4.0000");
  await page.getByRole("button", { name: "Jaccard" }).click();
  await expect(page.getByTestId("graph-pill-metric")).toHaveText("Jaccard");
  await expect(scoreValue).toHaveText("1.0000");

  await page.getByTestId("graph-train-select").selectOption({ label: "ABC" });
  await expect(trainValue).toHaveText("ABC");
  await page.getByRole("button", { name: "Mirror train" }).click();
  await expect(evalValue).toHaveText("ABC");
  await page.getByRole("button", { name: "Use full set" }).click();
  await expect(evalValue).toHaveText("ABCD");

  await quickActions.getByRole("button", { name: "Use empty train" }).click();
  await expect(trainValue).toHaveText("∅");
  await quickActions.getByRole("button", { name: "Use full train" }).click();
  await expect(trainValue).toHaveText("ABCD");

  await page.getByTestId("graph-removal-neighbors").getByRole("button", { name: /-B -> ACD/i }).click();
  await expect(trainValue).toHaveText("ACD");
  await page.getByTestId("graph-addition-neighbors").getByRole("button", { name: /\+B -> ABCD/i }).click();
  await expect(trainValue).toHaveText("ABCD");

  await page.locator('[aria-label="Select training world ABC"]').click();
  await expect(trainValue).toHaveText("ABC");
  await quickActions.getByRole("button", { name: "Use eval as train" }).click();
  await expect(trainValue).toHaveText("ABCD");
});

test("graph explorer lens buttons update the derived controls", async ({ page }) => {
  await openGraph(page);

  const panel = page.getByTestId("graph-lens-panel");
  const trainValue = page.getByTestId("graph-selected-train");

  await expect(panel).toContainText("Ablation delta");
  await page.getByTestId("graph-quick-actions").getByRole("button", { name: "Jump to without B" }).click();
  await expect(trainValue).toHaveText("ACD");

  await page.getByTestId("graph-quick-actions").getByRole("button", { name: "Use full train" }).click();
  await expect(trainValue).toHaveText("ABCD");

  await page.getByRole("button", { name: "Data strike path" }).click();
  await expect(panel).toContainText("Strike delta");
  await page.getByTestId("graph-focus-tokens").getByRole("button", { name: "C", exact: true }).click();
  await expect(panel).toContainText("reaches AD");
  await page.getByTestId("graph-quick-actions").getByRole("button", { name: "Jump to strike remainder" }).click();
  await expect(trainValue).toHaveText("AD");

  await page.getByTestId("graph-quick-actions").getByRole("button", { name: "Use full train" }).click();
  await page.getByRole("button", { name: "Shapley sweep" }).click();
  await expect(panel).toContainText("Shapley phi");

  await page.getByRole("button", { name: "Scaling layer" }).click();
  await expect(panel).toContainText("Average at k=2");
  await page.getByRole("button", { name: "k=1" }).click();
  await expect(panel).toContainText("Average at k=1");
});
