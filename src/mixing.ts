import type { Instruction, ResolvedInstruction } from "./types";

/** Why two piles cannot share a drum. `null` means they can. */
export type Blocker = "solo" | "settings" | "colour" | "lint";

export const blockerLegend: Record<Blocker, string> = {
  solo: "Wash on its own",
  settings: "Different programme, temperature, spin or options",
  colour: "Colours would run into each other",
  lint: "One sheds lint onto the other",
};

/** Short codes used in the compatibility matrix, so a cell stays one glyph. */
export const blockerCode: Record<Blocker, string> = {
  solo: "S",
  settings: "P",
  colour: "C",
  lint: "L",
};

function sameSettings(a: Instruction, b: Instruction): boolean {
  return (
    a.program === b.program &&
    a.temperature === b.temperature &&
    a.spin === b.spin &&
    a.options.length === b.options.length &&
    a.options.every((option) => b.options.includes(option))
  );
}

function compatibleColours(a: Instruction, b: Instruction): boolean {
  if (a.colourGroup === "any" || b.colourGroup === "any") return true;
  return a.colourGroup === b.colourGroup;
}

/**
 * Decides whether two piles can go in the drum together, and if not, why.
 *
 * The order matters: the reason reported is the one you would want to hear
 * first. "Wash it alone" beats "the spin speed differs", because changing the
 * spin speed would not help.
 */
export function mixBlocker(a: Instruction, b: Instruction): Blocker | null {
  if (a.mixTags.includes("solo") || b.mixTags.includes("solo")) return "solo";

  // Terry sheds lint over everything, so towels only ever go with towels.
  const shedders = [a, b].filter((item) => item.mixTags.includes("lint-shedder"));
  if (shedders.length === 1) return "lint";

  if (!compatibleColours(a, b)) return "colour";
  if (!sameSettings(a, b)) return "settings";
  return null;
}

export function canMix(a: Instruction, b: Instruction): boolean {
  return mixBlocker(a, b) === null;
}

/** Annotates each instruction with the other piles it may share a load with. */
export function resolve(instructions: Instruction[]): ResolvedInstruction[] {
  return instructions.map((instruction) => ({
    ...instruction,
    mixesWith: instructions
      .filter((other) => other !== instruction && canMix(instruction, other))
      .map((other) => other.clothingType),
  }));
}

/**
 * Groups piles that can all be washed together — every member compatible with
 * every other, not merely with the first one it met.
 */
export function loadGroups<T extends Instruction>(instructions: T[]): T[][] {
  const groups: T[][] = [];
  for (const instruction of instructions) {
    const home = groups.find((group) => group.every((member) => canMix(member, instruction)));
    if (home) home.push(instruction);
    else groups.push([instruction]);
  }
  return groups;
}

/**
 * Everything about a pile except what it is called. Two piles with the same
 * fingerprint have nothing left to tell you apart, so they share a card.
 */
function fingerprint(item: Instruction): string {
  return JSON.stringify([
    item.detergent,
    item.fabricSoftener,
    item.temperature,
    item.spin,
    item.duration,
    item.program,
    [...item.options].sort(),
    item.ironing,
    item.ironSetting,
    item.drying,
    item.colourGroup,
    [...item.mixTags].sort(),
    item.notes,
  ]);
}

/**
 * Piles whose instructions are identical in every attribute — programme, iron,
 * detergent, drying, the lot. Printing a card each would print the same card
 * twice, so they get one card listing both names.
 */
export function cardGroups<T extends Instruction>(instructions: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of instructions) {
    const key = fingerprint(item);
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}
