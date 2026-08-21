import { expect, type Page, test } from "@playwright/test";

/**
 * See `sheet.spec.ts` for why every navigation waits on `data-hydrated`
 * before interacting — the same island-hydration race applies here.
 */
async function goto(page: Page) {
  await page.goto("/config");
  await page.waitForSelector('[data-hydrated="true"]');
}

test("shows the machine's washer and iron settings, not a raw JSON dump", async ({ page }) => {
  await goto(page);

  await expect(page.getByText(/Generic front loader/)).toBeVisible();
  await expect(page.getByText(/Generic steam iron/)).toBeVisible();
  // A raw dump would read as one giant blob of braces and quotes; a
  // structured page has program names as their own visible list items.
  await expect(page.locator("pre")).toHaveCount(0);
});

test("shows every pile in the bundled chart", async ({ page }) => {
  await goto(page);

  const rows = page.locator("table tbody tr");
  await expect(rows).not.toHaveCount(0);
});

test("reflects an uploaded chart, not the bundled example", async ({ page }) => {
  // Upload happens on the main page — the config page reads the same
  // localStorage-backed chart, the same way SheetViewer does.
  await page.goto("/");
  await page.waitForSelector('[data-hydrated="true"]');
  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  rows[0].clothing_type = "Config Page E2E Pile";
  await page.setInputFiles('input[type="file"]', {
    name: "chart.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(rows, null, 2)),
  });
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  await goto(page);

  await expect(page.getByText("Config Page E2E Pile")).toBeVisible();
});

test("the nav reaches both pages, in both directions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-hydrated="true"]');
  const nav = page.getByRole("navigation", { name: "Site" });

  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Config" })).not.toHaveAttribute("aria-current");

  await nav.getByRole("link", { name: "Config" }).click();
  await expect(page).toHaveURL(/\/config\/?$/);
  await page.waitForSelector('[data-hydrated="true"]');
  await expect(nav.getByRole("link", { name: "Config" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");

  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});
