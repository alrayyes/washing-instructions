import { parse } from "csv-parse/sync";
import { ironSettingKeys, washer } from "./machine";
import type { ColourGroup, Instruction, MixTag } from "./types";
import { colourGroups, mixTags } from "./types";

const COLUMNS = [
  "clothing_type",
  "detergent",
  "fabric_softener",
  "temperature",
  "spin",
  "duration",
  "program",
  "options",
  "ironing",
  "iron_setting",
  "drying",
  "colour_group",
  "mix_tags",
  "notes",
] as const;

class CsvError extends Error {
  constructor(line: number, column: string, message: string) {
    super(`row ${line}, column "${column}": ${message}`);
    this.name = "CsvError";
  }
}

/** `a|b|c` -> `["a", "b", "c"]`, tolerating stray whitespace and empties. */
function splitList(value: string): string[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function oneOf<T extends string>(
  line: number,
  column: string,
  value: string,
  allowed: readonly T[],
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new CsvError(line, column, `"${value}" is not one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function boolean(line: number, column: string, value: string): boolean {
  const normalised = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(normalised)) return true;
  if (["no", "n", "false", "0"].includes(normalised)) return false;
  throw new CsvError(line, column, `"${value}" is not a yes/no value`);
}

/**
 * Parses the instruction CSV, checking every machine-facing value against what
 * the appliances in `machine.ts` can actually be set to. A typo in a programme
 * name fails here rather than producing a PDF that tells you to turn the dial
 * to a position that does not exist.
 */
export function parseInstructions(source: string): Instruction[] {
  const records: Record<string, string>[] = parse(source, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) throw new Error("the CSV has a header but no rows");

  const header = Object.keys(records[0] as Record<string, string>);
  const missing = COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new Error(`the CSV is missing column(s): ${missing.join(", ")}`);
  }

  return records.map((record, index) => {
    // +2: one for the header row, one because humans count from 1.
    const line = index + 2;

    const clothingType = (record.clothing_type ?? "").trim();
    if (clothingType === "") throw new CsvError(line, "clothing_type", "must not be empty");

    const options = splitList(record.options ?? "").map((option) =>
      oneOf(line, "options", option, washer.options),
    );

    const tags = splitList(record.mix_tags ?? "").map((tag) =>
      oneOf<MixTag>(line, "mix_tags", tag, mixTags),
    );

    return {
      clothingType,
      detergent: record.detergent ?? "",
      fabricSoftener: boolean(line, "fabric_softener", record.fabric_softener ?? ""),
      temperature: oneOf(line, "temperature", record.temperature ?? "", washer.temperatures),
      spin: oneOf(line, "spin", record.spin ?? "", washer.spins),
      duration: record.duration ?? "",
      program: oneOf(line, "program", record.program ?? "", washer.programs),
      options,
      ironing: record.ironing ?? "",
      ironSetting: oneOf(line, "iron_setting", record.iron_setting ?? "", [
        ...ironSettingKeys,
        "none",
      ] as const),
      drying: record.drying ?? "",
      colourGroup: oneOf<ColourGroup>(
        line,
        "colour_group",
        record.colour_group ?? "",
        colourGroups,
      ),
      mixTags: tags,
      notes: record.notes ?? "",
    };
  });
}
