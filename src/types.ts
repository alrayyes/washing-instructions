/** Which pile a garment belongs to on colour grounds. `any` mixes with all. */
export const colourGroups = ["white", "colour", "dark", "sport", "any"] as const;
export type ColourGroup = (typeof colourGroups)[number];

/**
 * Reasons two piles might not belong together even when the machine settings
 * agree. See `canMix` in `mixing.ts` for how each one is applied.
 */
export const mixTags = ["lint-shedder", "lint-magnet", "dye-bleeder", "solo"] as const;
export type MixTag = (typeof mixTags)[number];

/**
 * One CSV row: everything needed to wash, iron and dry one pile of laundry.
 *
 * The machine-facing fields are plain strings rather than unions, because what
 * counts as valid depends on the machine file you point this at. `csv.ts`
 * checks each of them against that machine as it parses, so nothing downstream
 * has to wonder whether a programme name exists.
 */
export interface Instruction {
  clothingType: string;
  detergent: string;
  fabricSoftener: boolean;
  temperature: string;
  spin: string;
  duration: string;
  program: string;
  options: string[];
  ironing: string;
  /** `"none"` means do not iron this at all. */
  ironSetting: string;
  drying: string;
  colourGroup: ColourGroup;
  mixTags: MixTag[];
  notes: string;
}

/** An instruction plus the other piles it may share a drum with. */
export interface ResolvedInstruction extends Instruction {
  mixesWith: string[];
}
