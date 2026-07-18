import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("data-counterfactuals.explainer-dismissed.v1", "true");
    localStorage.removeItem("data-counterfactuals.lab-state.v1");
  });
  await page.goto("/");
});

test("the default lab matches the one-removal comparison and switches views", async ({
  page,
}) => {
  await expect(page.getByTestId("counterfactual-lab")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "See what changes when data changes." }),
  ).toBeVisible();
  await expect(page.locator(".lab-afterword")).toHaveCount(0);
  const headingSize = await page
    .getByRole("heading", { name: "See what changes when data changes." })
    .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize));
  expect(headingSize).toBeLessThanOrEqual(76);
  await expect(page.getByText("One removal", { exact: true }).first()).toBeVisible();

  const changedWorld = page.getByRole("button", { name: /Changed world/ });
  await changedWorld.click();
  await expect(page.getByText("Comparison matched")).toBeVisible();
  await expect(page.getByText("-0.33")).toBeVisible();

  await page.getByRole("button", { name: "Graph" }).click();
  await expect(page.getByRole("button", { name: "Graph" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("canvas.lab-canvas")).toBeVisible();
});

test("prepared scenarios, free play, and workload tiers remain usable", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Budgeted selection/ }).click();
  await expect(page.getByText("Best k=2 world")).toBeVisible();
  await expect(page.locator(".winner-readout strong")).toHaveText("AC");

  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByText("Explore controls").click();
  const addObject = page.getByRole("button", { name: "Add a data object" });
  for (let index = 0; index < 13; index += 1) await addObject.click();
  await expect(page.getByText("Aggregate", { exact: true })).toBeVisible();
});

test("the SILO scene shows only published perplexities with provenance", async ({
  page,
}) => {
  await page.getByRole("button", { name: /SILO data opt-out/ }).click();

  await expect(
    page.getByRole("heading", { name: "SILO data opt-out", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Related books available ppl = 12.9/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Related books removed ppl = 16.5/ }),
  ).toBeVisible();
  await expect(page.getByText("+3.6", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Average 12.9 16.5 +3.6" }),
  ).toBeVisible();
  await expect(page.getByLabel("Metric")).toBeDisabled();
  await expect(page.getByRole("link", { name: /View Table 6/ })).toHaveAttribute(
    "href",
    "https://arxiv.org/pdf/2308.04430#page=13",
  );
  await expect(page.getByRole("link", { name: /Source code/ })).toHaveAttribute(
    "href",
    "https://github.com/kernelmachine/silo-lm",
  );
});

test("guided walkthrough and open A by B exploration are distinct modes", async ({
  page,
}) => {
  await expect(page.getByLabel("Lab mode")).toBeVisible();
  await expect(page.locator(".scenario-tray")).toBeVisible();

  await page.getByRole("button", { name: /Evaluation shift/ }).click();
  await expect(page.getByText("Comparison matched")).toBeVisible({
    timeout: 3000,
  });
  await expect(page.locator(".guided-progress li").filter({ hasText: "Compare" })).toHaveAttribute(
    "aria-current",
    "step",
  );

  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.locator(".scenario-tray")).toHaveCount(0);
  await expect(page.getByLabel("Add selected cells to")).toBeVisible();
  await expect(page.getByText("Select at least one cell for each world set.")).toBeVisible();

  await page.getByRole("button", { name: "Add to World A" }).click();
  await page.getByRole("button", { name: "World B", exact: true }).click();
  await page
    .getByLabel("Keyboard cell picker", { exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add to World B" }).click();

  await expect(page.locator(".counterfactual-results-heading strong")).toHaveText("1");
  await expect(page.getByText("Evaluation shifts", { exact: false })).toBeVisible();
  await expect(page.getByText("Computed all 1 A × B pairings.")).toBeVisible();
  await expect(page.getByText("1 of 13 ready", { exact: true })).toBeVisible();
  await expect(
    page.locator(".concept-plan.is-ready").getByText("Evaluation-set value"),
  ).toBeVisible();
});

test("concept planner shows missing evidence and can add it by side", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.getByText("0 of 13 ready", { exact: true })).toBeVisible();

  const leaveOneOut = page.locator(".concept-plan").filter({
    has: page.getByText("Leave-one-out", { exact: true }),
  });
  await leaveOneOut.locator("summary").click();
  await expect(leaveOneOut.getByText("Add to World A")).toBeVisible();
  await expect(leaveOneOut.getByText("Add to World B")).toBeVisible();
  await leaveOneOut.getByRole("button", { name: "Add 2 missing cells" }).click();

  await expect(page.getByText("3 of 13 ready", { exact: true })).toBeVisible();
  await expect(
    page.locator(".concept-plan.is-ready").getByText("Leave-one-out", {
      exact: true,
    }),
  ).toBeVisible();
});

test("configuration export is portable and invalid import does not replace state", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Export" }).click();
  const exported = await page.getByLabel("Lab configuration JSON").inputValue();
  expect(JSON.parse(exported).schema).toBe("data-counterfactuals/lab-state");
  await page.getByRole("button", { name: "Close dialog" }).click();

  await page.getByRole("button", { name: "Import" }).click();
  await page.getByLabel("Lab configuration JSON").fill('{"schema":"wrong"}');
  await page.getByRole("button", { name: "Validate configuration" }).click();
  await expect(page.getByText("Configuration not applied")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByText("One removal", { exact: true }).first()).toBeVisible();
});

test("keyboard users can complete the comparison without the canvas", async ({
  page,
}) => {
  const baseline = page.getByRole("button", { name: /Baseline/ });
  const changed = page.getByRole("button", { name: /Changed world/ });
  await baseline.focus();
  await page.keyboard.press("Tab");
  await expect(changed).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Comparison matched")).toBeVisible();
});
