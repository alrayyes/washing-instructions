import { describe, expect, test } from "bun:test";
import {
  cardGroups,
  DIST_MACHINE,
  ironGroups,
  ironSettingKeys,
  parseInstructions,
  type ResolvedInstruction,
  resolve,
  type Variant,
  variants,
  washGroups,
} from "@washy-washy/core";
import { renderToStaticMarkup } from "react-dom/server";
import Sheet, { ironCardKey, sheetGroups } from "../apps/web/src/components/Sheet";
import { loadMachine } from "../src/machine";

const machine = await loadMachine(DIST_MACHINE);
const csv = await Bun.file("data/washing-instructions.csv.dist").text();
const items = resolve(parseInstructions(csv, machine));

function render(variant: Variant, chart: ResolvedInstruction[] = items): string {
  return renderToStaticMarkup(Sheet({ items: chart, machine, variant }));
}

describe("Sheet", () => {
  for (const variant of variants) {
    test(`renders real markup for the ${variant} cut, not an embedded PDF`, () => {
      const html = render(variant);

      expect(html).not.toContain("<iframe");
      expect(html).not.toContain("<embed");
      expect(html).toContain(machine.washer.name);
    });

    test(`renders one card per group of the ${variant} cut`, () => {
      const html = render(variant);
      const groups = sheetGroups(items, machine, variant);

      expect((html.match(/<article/g) ?? []).length).toBe(groups.length);
    });

    test(`draws a dial for the legend and every card on the ${variant} cut`, () => {
      const html = render(variant);
      const groups = sheetGroups(items, machine, variant);
      // Legend draws one dial. A full/wash card draws one (the programme
      // dial); a full/iron card also draws the iron dial — wash drops it,
      // and the iron cut's cards are iron dials only.
      const perCard = variant === "wash" ? 1 : variant === "iron" ? 1 : 2;

      expect((html.match(/<svg/g) ?? []).length).toBe(1 + groups.length * perCard);
    });
  }

  test("the ironing cut has no softener badge — that's a washing-machine concern", () => {
    expect(render("iron")).not.toContain("SOFTENER");
  });

  test("the washing cut drops the per-card iron section the full cut has", () => {
    const full = render("full");
    const wash = render("wash");

    expect(full).toContain("IRON");
    expect(wash).not.toContain("IRON");
  });

  test("a chart with nothing to iron still renders under the full cut", () => {
    const neverIroned = items.map((item) => ({ ...item, ironing: false, ironSetting: "" }));

    const html = render("full", neverIroned);

    expect(html).toContain("Do not iron");
  });
});

describe("sheetGroups", () => {
  test("full cut groups the same way cardGroups does", () => {
    const expected = cardGroups(items).map((group) => group.map((item) => item.clothingType));
    const actual = sheetGroups(items, machine, "full").map((group) =>
      group.map((item) => item.clothingType),
    );

    expect(actual).toEqual(expected);
  });

  test("wash cut groups the same way washGroups does", () => {
    const expected = washGroups(items).map((group) => group.map((item) => item.clothingType));
    const actual = sheetGroups(items, machine, "wash").map((group) =>
      group.map((item) => item.clothingType),
    );

    expect(actual).toEqual(expected);
  });

  test("iron cut groups the same way ironGroups does", () => {
    const order = ironSettingKeys(machine);
    const expected = ironGroups(items, order).map((group) =>
      group.map((item) => item.clothingType),
    );
    const actual = sheetGroups(items, machine, "iron").map((group) =>
      group.map((item) => item.clothingType),
    );

    expect(actual).toEqual(expected);
  });
});

describe("ironCardKey", () => {
  test("keys an ironed pile by its thermostat setting", () => {
    const ironed = items.find((item) => item.ironing);
    if (!ironed) throw new Error("fixture chart has nothing to iron — pick a different fixture");

    expect(ironCardKey(ironed)).toBe(ironed.ironSetting);
  });

  test("keys every never-ironed pile the same way, regardless of its own fields", () => {
    const neverIroned = items.find((item) => !item.ironing);
    if (!neverIroned) throw new Error("fixture chart irons everything — pick a different fixture");

    expect(ironCardKey(neverIroned)).toBe("do-not-iron");
  });
});
