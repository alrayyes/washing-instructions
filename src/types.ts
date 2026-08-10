import type { IronSettingKey, OptionName, ProgramName, Spin, Temperature } from "./machine";

/** Which pile a garment belongs to on colour grounds. `any` mixes with all. */
export const colourGroups = ["white", "colour", "dark", "sport", "any"] as const;
export type ColourGroup = (typeof colourGroups)[number];

/**
 * Reasons two piles might not belong together even when the machine settings
 * agree. See `canMix` in `mixing.ts` for how each one is applied.
 */
export const mixTags = ["lint-shedder", "lint-magnet", "dye-bleeder", "solo"] as const;
export type MixTag = (typeof mixTags)[number];

/** One CSV row: everything needed to wash, iron and dry one pile of laundry. */
export interface Instruction {
  clothingType: string;
  detergent: string;
  fabricSoftener: boolean;
  temperature: Temperature;
  spin: Spin;
  duration: string;
  program: ProgramName;
  options: OptionName[];
  ironing: string;
  /** `"none"` means do not iron this at all. */
  ironSetting: IronSettingKey | "none";
  drying: string;
  colourGroup: ColourGroup;
  mixTags: MixTag[];
  notes: string;
}

/** An instruction plus the other piles it may share a drum with. */
export interface ResolvedInstruction extends Instruction {
  mixesWith: string[];
}
