import { describe, expect, test } from "bun:test";
import { canMix, cardGroups, loadGroups, mixBlocker, resolve } from "../src/mixing";
import type { Instruction } from "../src/types";

function pile(overrides: Partial<Instruction> = {}): Instruction {
  return {
    clothingType: "Test",
    detergent: "",
    fabricSoftener: false,
    temperature: "40",
    spin: "1200",
    duration: "",
    program: "Katoen",
    options: ["Eco Perfect"],
    ironing: "",
    ironSetting: "none",
    drying: "",
    colourGroup: "colour",
    mixTags: [],
    notes: "",
    ...overrides,
  };
}

describe("mixBlocker", () => {
  test("lets two identical piles share a drum", () => {
    expect(mixBlocker(pile({ clothingType: "A" }), pile({ clothingType: "B" }))).toBeNull();
  });

  test("keeps whites away from colours", () => {
    expect(mixBlocker(pile({ colourGroup: "white" }), pile({ colourGroup: "colour" }))).toBe(
      "colour",
    );
  });

  test("separates piles whose machine settings differ", () => {
    expect(mixBlocker(pile(), pile({ temperature: "60" }))).toBe("settings");
    expect(mixBlocker(pile(), pile({ spin: "1400" }))).toBe("settings");
    expect(mixBlocker(pile(), pile({ program: "Wol" }))).toBe("settings");
    expect(mixBlocker(pile(), pile({ options: [] }))).toBe("settings");
  });

  test("ignores the order options are listed in", () => {
    const a = pile({ options: ["Eco Perfect", "Extra spoelen"] });
    const b = pile({ options: ["Extra spoelen", "Eco Perfect"] });
    expect(canMix(a, b)).toBe(true);
  });

  test("keeps a lint shedder away from anything that is not one", () => {
    const towels = pile({ mixTags: ["lint-shedder"] });
    expect(mixBlocker(towels, pile())).toBe("lint");
    expect(mixBlocker(towels, pile({ mixTags: ["lint-shedder"] }))).toBeNull();
  });

  test("reports solo before any other reason", () => {
    const wool = pile({ mixTags: ["solo"], colourGroup: "any" });
    expect(mixBlocker(wool, pile({ colourGroup: "white", temperature: "90" }))).toBe("solo");
  });

  test("is symmetric", () => {
    const a = pile({ mixTags: ["lint-shedder"], colourGroup: "white" });
    const b = pile({ colourGroup: "dark", temperature: "30" });
    expect(mixBlocker(a, b)).toBe(mixBlocker(b, a));
  });
});

describe("resolve", () => {
  test("never lists a pile as mixing with itself", () => {
    const items = resolve([pile({ clothingType: "A" }), pile({ clothingType: "B" })]);
    expect(items[0]?.mixesWith).toEqual(["B"]);
    expect(items[1]?.mixesWith).toEqual(["A"]);
  });

  test("leaves a solo pile with nothing to mix with", () => {
    const items = resolve([pile({ clothingType: "Wool", mixTags: ["solo"] }), pile()]);
    expect(items[0]?.mixesWith).toEqual([]);
  });
});

describe("cardGroups", () => {
  test("merges piles that differ only in name", () => {
    const groups = cardGroups([
      pile({ clothingType: "AIRism" }),
      pile({ clothingType: "HEATTECH" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((item) => item.clothingType)).toEqual(["AIRism", "HEATTECH"]);
  });

  test("keeps piles apart when any single attribute differs", () => {
    const attributes: Partial<Instruction>[] = [
      { detergent: "Something else" },
      { fabricSoftener: true },
      { temperature: "60" },
      { spin: "400" },
      { duration: "~9:99" },
      { program: "Wol" },
      { options: [] },
      { ironing: "Carefully" },
      { ironSetting: "3" },
      { drying: "On a line" },
      { colourGroup: "dark" },
      { mixTags: ["solo"] },
      { notes: "Beware" },
    ];
    for (const attribute of attributes) {
      const groups = cardGroups([
        pile({ clothingType: "A" }),
        pile({ clothingType: "B", ...attribute }),
      ]);
      expect(groups, `differing on ${Object.keys(attribute)[0]}`).toHaveLength(2);
    }
  });

  test("ignores the order options and tags are listed in", () => {
    const groups = cardGroups([
      pile({ clothingType: "A", options: ["Eco Perfect", "Extra spoelen"] }),
      pile({ clothingType: "B", options: ["Extra spoelen", "Eco Perfect"] }),
    ]);
    expect(groups).toHaveLength(1);
  });

  test("keeps every pile exactly once", () => {
    const items = [
      pile({ clothingType: "A" }),
      pile({ clothingType: "B" }),
      pile({ clothingType: "C", temperature: "60" }),
    ];
    expect(cardGroups(items).flat()).toHaveLength(items.length);
  });
});

describe("loadGroups", () => {
  test("only groups piles that are all compatible with each other", () => {
    const groups = loadGroups([
      pile({ clothingType: "A" }),
      pile({ clothingType: "B" }),
      pile({ clothingType: "C", temperature: "60", colourGroup: "white" }),
    ]);
    expect(groups.map((group) => group.map((item) => item.clothingType))).toEqual([
      ["A", "B"],
      ["C"],
    ]);
  });
});
