import { describe, expect, test } from "bun:test";
import { DIST_MACHINE, parseInstructions, resolve, variants } from "@washy-washy/core";
import { renderPhone } from "@washy-washy/pdf";
import { PDFDocument } from "pdf-lib";
import { buildChart } from "../apps/web/src/lib/chart";
import { filterByPile } from "../apps/web/src/lib/filter";
import { loadMachine } from "../src/machine";

async function loadWebChart() {
  const csv = await Bun.file("data/washing-instructions.csv.dist").text();
  const machineSource = await Bun.file("data/machine.json.dist").text();
  return buildChart(csv, machineSource);
}

describe("buildChart", () => {
  test("parses the same items and machine the CLI draws the bundled examples from", async () => {
    const machine = await loadMachine(DIST_MACHINE);
    const csv = await Bun.file("data/washing-instructions.csv.dist").text();
    const expected = resolve(parseInstructions(csv, machine));

    const chart = await loadWebChart();

    expect(chart.machine).toEqual(machine);
    expect(chart.items).toEqual(expected);
  });
});

describe("filterByPile", () => {
  test("keeps every pile when the query is empty or blank", async () => {
    const { items } = await loadWebChart();

    expect(filterByPile(items, "")).toEqual(items);
    expect(filterByPile(items, "   ")).toEqual(items);
  });

  test("matches by substring, case-insensitively", async () => {
    const { items } = await loadWebChart();

    const matches = filterByPile(items, "sock");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(items.length);
    for (const item of matches) expect(item.clothingType.toLowerCase()).toContain("sock");
  });

  test("matches nothing rather than falling back to everything", async () => {
    const { items } = await loadWebChart();

    expect(filterByPile(items, "no such pile")).toEqual([]);
  });
});

describe("renderPhone from the web chart", () => {
  for (const variant of variants) {
    test(`fits the ${variant} cut on one page, the same as the CLI`, async () => {
      const { items, machine } = await loadWebChart();

      const { pdf } = await renderPhone(items, machine, variant);

      expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
    });
  }
});
