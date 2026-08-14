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

/**
 * How long a card or a load is going to tie the machine up.
 *
 * Usually one figure. Piles sharing a load agree on every setting, so they
 * ought to agree on this too — but the chart is data somebody types, and
 * printing both is more honest than picking the first one and hoping.
 */
export function durationsOf(group: Instruction[]): string {
  return [...new Set(group.map((item) => item.duration).filter((value) => value !== ""))].join(
    " / ",
  );
}

/**
 * What an ironing line says once "do not iron" has already been said.
 *
 * The no-iron card leads with the refusal, so a pile whose whole line is
 * "Don't." earns a blank rather than a row repeating it — you already know you
 * do not iron socks, and the eye still has to stop on every one of them. A pile
 * that says *why* keeps the why, which is the part you did not know.
 *
 * Only a leading refusal goes. "Steam, don't press hard" is advice about
 * ironing something, and survives untouched.
 */
export function beyondDoNotIron(ironing: string): string {
  return ironing.replace(/^\s*(don'?t|do not iron|never)\b[.!]*\s*/i, "").trim();
}

/**
 * Which sheet to draw.
 *
 * `full` is the whole chart. The other two are the same chart cut where the
 * work is: washing happens in front of the machine on a Sunday morning, ironing
 * happens at a board on a Wednesday evening, and neither job wants to read past
 * the other's advice to find its own.
 */
export const variants = ["full", "wash", "iron"] as const;
export type Variant = (typeof variants)[number];
