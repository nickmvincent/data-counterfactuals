import { test, expect } from "@playwright/test";

test("graph explorer renders the subset lattice and switches lenses", async ({ page }) => {
  await page.goto("/graph");

  const toolbar = page.getByTestId("graph-explorer-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(page.locator('.graph-workspace[data-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("explorer-graph")).toBeVisible();

  const panel = page.getByTestId("graph-lens-panel");
  await expect(panel).toContainText("Ablation delta");
  await expect(page.getByLabel("Training world")).toBeVisible();
  await expect(page.getByLabel("Evaluation slice")).toBeVisible();

  await page.getByRole("button", { name: "Data strike path" }).click();
  await expect(panel).toContainText("Strike delta");

  await page.getByRole("button", { name: "Shapley sweep" }).click();
  await expect(panel).toContainText("Shapley phi");

  await page.getByRole("button", { name: "Scaling layer" }).click();
  await expect(panel).toContainText("Average at k=");
});
