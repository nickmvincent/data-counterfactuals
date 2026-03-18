import { test, expect } from "@playwright/test";

async function openApiExplorer(page) {
  await page.goto("/api-explorer");
  await expect(page.getByTestId("api-explorer")).toBeVisible();
  await expect(page.getByTestId("api-request")).toBeVisible();
  await expect(page.getByTestId("api-response")).toBeVisible();
}

test("api explorer swaps examples and renders the matching response shape", async ({ page }) => {
  await openApiExplorer(page);

  const response = page.getByTestId("api-response");
  await expect(response).toContainText('"response": "matrix"');
  await expect(response).toContainText('"explorer": "grid"');

  await page.getByTestId("api-example-graphAnswer").click();
  await expect(response).toContainText('"response": "answer"');
  await expect(response).toContainText('"explorer": "graph"');
  await expect(response).toContainText('"label": "Strike delta"');
});

test("api explorer runs an edited request body", async ({ page }) => {
  await openApiExplorer(page);

  const request = page.getByTestId("api-request");
  await request.fill(`{
  "explorer": "grid",
  "response": "cell",
  "count": 4,
  "metric": "inter",
  "train": "ABC",
  "eval": "AB"
}`);

  await page.getByTestId("api-run").click();

  const response = page.getByTestId("api-response");
  await expect(response).toContainText('"response": "cell"');
  await expect(response).toContainText('"train": "ABC"');
  await expect(response).toContainText('"eval": "AB"');
  await expect(response).toContainText('"value": 2');
});
