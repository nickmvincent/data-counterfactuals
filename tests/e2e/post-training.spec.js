import { test, expect } from "@playwright/test";

test("post-training explorer renders and updates the counterfactual readout", async ({ page }) => {
  await page.goto("/post-training");

  await expect(page.getByRole("heading", { name: "Human Feedback Value" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status: stub and mockup." })).toBeVisible();
  await expect(page.getByText("this site treats the cross-stage version as unsolved")).toBeVisible();
  await expect(page.getByText("The worked example below uses made-up numbers.")).toBeVisible();
  await expect(page.getByTestId("post-training-explorer")).toBeVisible();
  await expect(page.getByTestId("post-training-explorer")).toHaveAttribute("data-ready", "true");
  await expect(page.getByText("These numbers are invented.")).toBeVisible();
  await expect(page.getByText("not to imply that these stages already share an exchangeable value scale")).toBeVisible();
  await expect(page.getByText("Preference rankings")).toBeVisible();

  await page.getByRole("button", { name: "Withhold access" }).click();

  await expect(page.getByRole("heading", { name: "Withhold access: Rankings" })).toBeVisible();
  await expect(page.getByText("bargaining power over future feedback")).toBeVisible();
});
