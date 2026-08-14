import { describe, expect, test } from "bun:test";
import type { Instruction } from "../src/types";
import { beyondDoNotIron, durationsOf } from "../src/types";

function pile(overrides: Partial<Instruction> = {}): Instruction {
  return {
    clothingType: "Test",
    detergent: "",
    fabricSoftener: false,
    temperature: "40",
    spin: "1200",
    duration: "~2:00",
    program: "Katoen",
    options: [],
    ironing: "",
    ironSetting: "none",
    drying: "",
    colourGroup: "colour",
    mixTags: [],
    notes: "",
    ...overrides,
  };
}

describe("durationsOf", () => {
  test("says it once when the piles agree", () => {
    expect(durationsOf([pile(), pile()])).toBe("~2:00");
  });

  test("prints both rather than picking one when they disagree", () => {
    expect(durationsOf([pile(), pile({ duration: "~1:10" })])).toBe("~2:00 / ~1:10");
  });

  test("skips a pile that gives no duration at all", () => {
    expect(durationsOf([pile({ duration: "" }), pile()])).toBe("~2:00");
  });
});

/**
 * The ironing sheet's no-iron card has already said "do not iron" in its
 * heading, so a row that only repeats it is a row the eye stops on for nothing.
 */
describe("beyondDoNotIron", () => {
  test("leaves nothing when the line only refuses", () => {
    expect(beyondDoNotIron("Don't.")).toBe("");
    expect(beyondDoNotIron("Don't")).toBe("");
    expect(beyondDoNotIron("  don't.  ")).toBe("");
    expect(beyondDoNotIron("Do not iron.")).toBe("");
    expect(beyondDoNotIron("Never.")).toBe("");
    expect(beyondDoNotIron("")).toBe("");
  });

  test("keeps the reason when the line gives one", () => {
    expect(beyondDoNotIron("Don't. Ironing crushes the pile flat.")).toBe(
      "Ironing crushes the pile flat.",
    );
    expect(beyondDoNotIron("Don't. Elastane starts degrading around 110 °C.")).toBe(
      "Elastane starts degrading around 110 °C.",
    );
  });

  /** It runs over every pile on the card, not only the ones that refuse. */
  test("leaves a line that never refused alone", () => {
    expect(beyondDoNotIron("Low heat through a pressing cloth.")).toBe(
      "Low heat through a pressing cloth.",
    );
    // "don't" inside a sentence is advice, not a refusal.
    expect(beyondDoNotIron("Steam, don't press hard.")).toBe("Steam, don't press hard.");
  });
});
