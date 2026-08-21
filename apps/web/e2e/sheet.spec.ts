import { expect, type Page, test } from "@playwright/test";

/**
 * The real user journeys `test/web-*.test.ts` can't reach: those exercise
 * pure logic and static markup (`renderToStaticMarkup`), never an actual
 * browser, an actual click, or actual `localStorage`. This is the outer,
 * end-to-end layer that was missing — see #67.
 */

/**
 * `SheetViewer` is a client:load island: the server-rendered HTML is on the
 * page before React attaches to it. An interaction fired in that gap still
 * "succeeds" — Playwright mutates the real DOM node — but nothing is
 * listening yet, so the change never reaches React state. Racy without this:
 * passed most of the time, since hydration is normally fast, and failed
 * outright once it wasn't.
 */
async function goto(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForSelector('[data-hydrated="true"]');
}

test("shows the bundled chart as a real page, not an embedded PDF", async ({ page }) => {
  await goto(page);

  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("article")).not.toHaveCount(0);
  await expect(page.locator("svg").first()).toBeVisible();
});

test("cut filter switches which sheet renders", async ({ page }) => {
  await goto(page);
  const cards = page.locator("article");
  const fullCount = await cards.count();

  await page.locator("fieldset select").selectOption("iron");

  // The ironing cut groups by thermostat position rather than one card per
  // pile, so the count is expected to change, not just the content.
  await expect(cards.first()).toContainText(/Thermostat on|Do not iron/i);
  expect(await cards.count()).not.toBe(fullCount);
});

test("pile search narrows the cards, and a non-match says so", async ({ page }) => {
  await goto(page);
  const cards = page.locator("article");
  const allCount = await cards.count();

  await page.fill('input[type="search"]', "sock");
  await expect(cards).not.toHaveCount(allCount);
  const filteredCount = await cards.count();
  expect(filteredCount).toBeGreaterThan(0);
  for (const heading of await page.locator("article h3").allInnerTexts()) {
    expect(heading.toLowerCase()).toContain("sock");
  }

  await page.fill('input[type="search"]', "no such pile at all");
  await expect(page.getByText(/No pile matches/)).toBeVisible();
  await expect(cards).toHaveCount(0);
});

test("the download button generates a PDF only when clicked, not before", async ({ page }) => {
  await goto(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download this sheet as a PDF/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("washing-instructions-phone.pdf");
  const path = await download.path();
  expect(path).not.toBeNull();
});

test("uploading a chart, downloading it back out, and clearing it round-trip", async ({ page }) => {
  await goto(page);

  // Download the active (bundled) chart, edit one pile's name, and
  // re-upload it — the same round trip a household member editing their
  // chart externally would do.
  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  rows[0].clothing_type = "E2E Custom Pile";

  await page.setInputFiles('input[type="file"]', {
    name: "chart.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(rows, null, 2)),
  });

  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();
  await page.fill('input[type="search"]', "E2E Custom Pile");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article h3").first()).toContainText("E2E Custom Pile");

  // Upload something invalid: the error shows, and the just-uploaded chart
  // stays active rather than silently reverting.
  await page.setInputFiles('input[type="file"]', {
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{not valid json"),
  });
  await expect(page.getByRole("alert")).toContainText("Could not use that file");
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();

  await page.getByRole("button", { name: /Use the bundled example instead/ }).click();
  await expect(page.getByText("Showing the bundled example chart.")).toBeVisible();
});

test("an uploaded chart with a value the machine doesn't have names the row and column", async ({
  page,
}) => {
  await goto(page);

  // Valid JSON, but a temperature the bundled machine can't be set to — the
  // kind of typo a household member editing the chart by hand would make.
  // #72: this should name exactly what's wrong, not just "invalid chart".
  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  rows[0].temperature = "99";

  await page.setInputFiles('input[type="file"]', {
    name: "chart.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(rows, null, 2)),
  });

  await expect(page.getByRole("alert")).toContainText(/row \d+, column "temperature"/);
  await expect(page.getByRole("alert")).toContainText("99");
  // The bad upload never took: still the bundled chart, not a half-applied one.
  await expect(page.getByText("Showing the bundled example chart.")).toBeVisible();
});

test("filters and an uploaded chart both survive a reload", async ({ page }) => {
  await goto(page);

  await page.locator("fieldset select").selectOption("wash");
  const href = await page.locator('a[download="washing-instructions.json"]').getAttribute("href");
  const rows = JSON.parse(
    decodeURIComponent(href?.replace("data:application/json;charset=utf-8,", "") ?? ""),
  );
  rows[0].clothing_type = "Persisted E2E Pile";
  await page.setInputFiles('input[type="file"]', {
    name: "chart.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(rows, null, 2)),
  });
  await page.fill('input[type="search"]', "Persisted E2E Pile");
  await expect(page.locator("article")).toHaveCount(1);

  await page.reload();
  await page.waitForSelector('[data-hydrated="true"]');

  await expect(page.locator("fieldset select")).toHaveValue("wash");
  await expect(page.locator('input[type="search"]')).toHaveValue("Persisted E2E Pile");
  await expect(page.getByText("Showing your uploaded chart.")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article h3").first()).toContainText("Persisted E2E Pile");
});

test("opening a URL with filter state applies it immediately, no click needed", async ({
  page,
}) => {
  // "wash", not "iron": the iron cut groups cards by thermostat setting, not
  // by pile, so its headings wouldn't contain the pile name being asserted
  // on below — "cut filter switches which sheet renders" covers that
  // grouping behaviour separately.
  await goto(page, "/?cut=wash&pile=towels");

  await expect(page.locator("fieldset select")).toHaveValue("wash");
  await expect(page.locator('input[type="search"]')).toHaveValue("towels");
  const headings = await page.locator("article h3").allInnerTexts();
  expect(headings.length).toBeGreaterThan(0);
  for (const heading of headings) {
    expect(heading.toLowerCase()).toContain("towels");
  }
});

test("changing filters updates the URL, without spamming browser history", async ({ page }) => {
  await goto(page);

  const historyLength = await page.evaluate(() => history.length);

  await page.locator("fieldset select").selectOption("wash");
  await expect(page).toHaveURL(/[?&]cut=wash/);
  await page.fill('input[type="search"]', "sock");
  await expect(page).toHaveURL(/[?&]pile=sock/);

  // Both changes above went through replaceState, not pushState — the
  // history stack shouldn't have grown at all.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  // Back to the defaults: the params drop out rather than sitting there as
  // ?cut=full&pile= noise.
  await page.locator("fieldset select").selectOption("full");
  await page.fill('input[type="search"]', "");
  await expect(page).toHaveURL(/^[^?]*\/?$/);
});

test("a URL's filter state wins over a previous visit's saved filters", async ({ page }) => {
  // A previous, unrelated visit: washing only, searching for "denim".
  await goto(page);
  await page.locator("fieldset select").selectOption("wash");
  await page.fill('input[type="search"]', "denim");

  // A shared link arrives with different state — it should win outright,
  // not merge with what's saved.
  await goto(page, "/?cut=iron&pile=towels");

  await expect(page.locator("fieldset select")).toHaveValue("iron");
  await expect(page.locator('input[type="search"]')).toHaveValue("towels");
});
