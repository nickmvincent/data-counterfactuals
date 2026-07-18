import { test, expect } from "@playwright/test";

const retiredRoutes = [
  "/grid",
  "/graph",
  "/api-explorer",
  "/advanced.html",
  "/discussions",
  "/glossary",
  "/memo",
  "/memo/data-counterfactuals",
];

test("retired routes return 404 without redirects", async ({ request }) => {
  for (const route of retiredRoutes) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(404);
  }
});

test("mobile receives the static summary instead of an initialized lab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What changes when data changes?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Counterfactual instrument / desktop lab"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "How might we visualize the removal of some data from an AI training set? A grid? A graph?",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("See full “visual” lab (desktop is best)."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A public experimental visualization tool and non-exhaustive paper list showing how cross-cutting data counterfactuals are.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read more (external link)" }),
  ).toHaveText("Read more · external ↗");
  await expect(page.getByTestId("counterfactual-lab")).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
