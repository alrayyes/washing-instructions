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

  const rows = page.locator('[data-testid="chart-cards"] > article');
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

  // Chart cells are editable inputs, not plain text (#74) — getByText
  // can't see an input's value, so check the value directly.
  await expect(
    page
      .locator('[data-testid="chart-cards"] > article')
      .first()
      .locator('input[name="clothing_type"]'),
  ).toHaveValue("Config Page E2E Pile");
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

test("editing a chart field and saving applies it across the site", async ({ page }) => {
  await goto(page);

  const detergentInput = page
    .locator('[data-testid="chart-cards"] > article')
    .first()
    .locator('textarea[name="detergent"]');
  await detergentInput.fill("E2E Custom Detergent Note");
  await page.getByRole("button", { name: /Save changes/ }).click();

  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();
  await expect(detergentInput).toHaveValue("E2E Custom Detergent Note");

  // The same edit shows up on the main page — both read the same
  // localStorage-backed chart (customChart.ts).
  await page.goto("/");
  await page.waitForSelector('[data-hydrated="true"]');
  await expect(page.getByText("E2E Custom Detergent Note")).toBeVisible();
});

test("an invalid edit names the row and column, and isn't applied", async ({ page }) => {
  await goto(page);

  // Every constrained field (temperature, programme, …) is a chip or a
  // select now — the UI can't produce an invalid value for those at all.
  // Emptying the one genuinely free-text required field is the remaining
  // way to reach instructionsFromRows's validation from this page.
  const pileInput = page
    .locator('[data-testid="chart-cards"] > article')
    .first()
    .locator('input[name="clothing_type"]');
  await pileInput.fill("");
  await page.getByRole("button", { name: /Save changes/ }).click();

  await expect(page.getByRole("alert")).toContainText(/row \d+, column "clothing_type"/);
  await expect(page.getByRole("alert")).toContainText("must not be empty");
  // The bad edit never took: still the bundled chart, not a half-applied one.
  await expect(page.getByText("Showing the bundled example chart.")).toBeVisible();
});

test("chips and pills all apply and download correctly", async ({ page }) => {
  await goto(page);

  // Every constrained field is a click, styled the same as the read-only
  // sheet's chip rows (Sheet.tsx's ChipRow) — see the screenshot in #90.
  const card = page.locator('[data-testid="chart-cards"] > article').first();
  await card.locator('[data-testid="chip-temperature-30"]').click();
  await card.locator('[data-testid="toggle-fabric_softener"]').click();
  await card.locator('[data-testid="chip-options-Speed"]').click();
  await card.locator('[data-testid="chip-colour_group-dark"]').click();
  await card.locator('[data-testid="chip-mix_tags-solo"]').click();
  await page.getByRole("button", { name: /Save changes/ }).click();

  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  expect(rows[0].temperature).toBe("30");
  expect(rows[0].fabric_softener).toBe("yes");
  expect(rows[0].options.split("|")).toContain("Speed");
  expect(rows[0].colour_group).toBe("dark");
  expect(rows[0].mix_tags.split("|")).toContain("solo");
});

test("toggling ironing off hides the iron setting chips and clears the value", async ({ page }) => {
  await goto(page);

  // The first pile in the bundled chart is ironed — see data/washing-
  // instructions.csv.dist — so its iron-setting chips start visible.
  const card = page.locator('[data-testid="chart-cards"] > article').first();
  await expect(card.locator('[data-testid="chip-iron_setting-3"]')).toBeVisible();

  await card.locator('[data-testid="toggle-ironing"]').click();

  await expect(card.locator('[data-testid="chip-iron_setting-3"]')).toHaveCount(0);
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  expect(rows[0].ironing).toBe("no");
  expect(rows[0].iron_setting).toBe("");
});

test("an edit survives a reload", async ({ page }) => {
  await goto(page);

  const notesInput = page
    .locator('[data-testid="chart-cards"] > article')
    .first()
    .locator('textarea[name="notes"]');
  await notesInput.fill("Persisted E2E note");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  await page.reload();
  await page.waitForSelector('[data-hydrated="true"]');

  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();
  await expect(
    page.locator('[data-testid="chart-cards"] > article').first().locator('textarea[name="notes"]'),
  ).toHaveValue("Persisted E2E note");
});

test("downloading the chart from the config page reflects an edit", async ({ page }) => {
  await goto(page);

  const notesInput = page
    .locator('[data-testid="chart-cards"] > article')
    .first()
    .locator('textarea[name="notes"]');
  await notesInput.fill("Download E2E note");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  expect(rows[0].notes).toBe("Download E2E note");
});
