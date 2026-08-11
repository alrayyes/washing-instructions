/**
 * A Frictionless Table Schema for the instruction CSV.
 *
 * Generated rather than written by hand, because the machine file is the
 * authority on what the appliances can be set to and a second copy of those
 * lists would drift away from it the first time a programme is renamed. A test
 * checks the committed JSON against what this produces, so the drift fails CI
 * instead of quietly misleading whatever reads the schema.
 *
 * It is generated from the committed `.dist` machine, not from yours: the
 * schema goes in the repository, so it has to describe the chart the repository
 * ships. Point a validator at your own chart and it will complain about your
 * own programme names — which is why the parser, not the schema, is the gate.
 *
 * Table Schema rather than CSVW: it says the same things about columns and
 * constraints, is a plain JSON object an editor can read, and has validators
 * that take a CSV and the schema and tell you which row is wrong.
 */
import { DIST_MACHINE, ironSettingKeys, loadMachine, type Machine } from "../src/machine";
import { colourGroups, mixTags } from "../src/types";

export const SCHEMA_PATH = "data/washing-instructions.schema.json";

interface Field {
  name: string;
  type: string;
  trueValues?: string[];
  falseValues?: string[];
  title: string;
  description: string;
  constraints?: {
    required?: boolean;
    enum?: string[];
    pattern?: string;
  };
}

interface TableSchema {
  $schema: string;
  name: string;
  title: string;
  description: string;
  fields: Field[];
  primaryKey: string[];
}

/** `a|b|c` in one cell, so the values are constrained by pattern rather than enum. */
function pipeSeparated(allowed: readonly string[]): string {
  const one = `(${allowed.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`;
  return `^$|^${one}( *\\| *${one})*$`;
}

export function tableSchema(machine: Machine): TableSchema {
  const { washer } = machine;
  return {
    $schema: "https://datapackage.org/profiles/2.0/tableschema.json",
    name: "washing-instructions",
    title: "Washing instructions",
    description:
      "One row per pile of laundry. Every machine-facing value is a setting the " +
      `${washer.name} can actually be turned to.`,
    fields: [
      {
        name: "clothing_type",
        type: "string",
        title: "Pile",
        description: "What you call the pile. This becomes the heading on its card.",
        constraints: { required: true },
      },
      {
        name: "detergent",
        type: "string",
        title: "Detergent",
        description: "Which detergent, and how much of it.",
      },
      {
        name: "fabric_softener",
        type: "boolean",
        // Frictionless reads only true/1 and false/0 by default, and this
        // column has said yes and no since the first chart. The schema
        // describes what the parser accepts rather than asking the data to
        // change to suit it — src/csv.ts takes all of these.
        trueValues: ["yes", "y", "true", "1"],
        falseValues: ["no", "n", "false", "0"],
        title: "Fabric softener",
        description: "Whether softener goes in. Written yes or no.",
      },
      {
        name: "temperature",
        type: "string",
        title: "Temperature",
        description: "A temperature the display steps through. koud is the snowflake.",
        constraints: { required: true, enum: [...washer.temperatures] },
      },
      {
        name: "spin",
        type: "string",
        title: "Spin speed",
        description: "Spin in rpm. 0 is drain without spinning.",
        constraints: { required: true, enum: [...washer.spins] },
      },
      {
        name: "duration",
        type: "string",
        title: "Duration",
        description: "Roughly how long the programme runs, for planning the day around it.",
      },
      {
        name: "program",
        type: "string",
        title: "Programme",
        description: "A dial position, spelled exactly as it is printed on the fascia.",
        constraints: { required: true, enum: [...washer.programs] },
      },
      {
        name: "options",
        type: "string",
        title: "Option buttons",
        description: "Option buttons to press, pipe-separated. Empty for none.",
        constraints: { pattern: pipeSeparated(washer.options) },
      },
      {
        name: "ironing",
        type: "string",
        title: "Ironing",
        description: "Prose: how to iron it, or why not to.",
      },
      {
        name: "iron_setting",
        type: "string",
        title: "Iron thermostat",
        description: "Where the iron's thermostat points. none means do not iron this at all.",
        constraints: { required: true, enum: ironSettingKeys(machine) },
      },
      {
        name: "drying",
        type: "string",
        title: "Drying",
        description: "Prose: how to dry it.",
      },
      {
        name: "colour_group",
        type: "string",
        title: "Colour group",
        description: "Which piles it may share a drum with on colour grounds. any mixes with all.",
        constraints: { required: true, enum: [...colourGroups] },
      },
      {
        name: "mix_tags",
        type: "string",
        title: "Mixing tags",
        description:
          "Reasons this pile cannot share a drum even when the settings agree, pipe-separated.",
        constraints: { pattern: pipeSeparated(mixTags) },
      },
      {
        name: "notes",
        type: "string",
        title: "Notes",
        description: "Anything else worth knowing while you are standing at the machine.",
      },
    ],
    primaryKey: ["clothing_type"],
  };
}

if (import.meta.main) {
  const machine = await loadMachine(DIST_MACHINE);
  await Bun.write(SCHEMA_PATH, `${JSON.stringify(tableSchema(machine), null, 2)}\n`);

  // Biome owns the JSON in this repo, and JSON.stringify does not lay it out
  // the way Biome would, so hand it over rather than leaving `bun run lint` to
  // fail on a file nobody typed. The drift test compares parsed objects, so how
  // it ends up formatted is none of its business.
  const format = Bun.spawnSync(["node_modules/.bin/biome", "format", "--write", SCHEMA_PATH]);
  if (!format.success) {
    throw new Error(`biome could not format ${SCHEMA_PATH}: ${format.stderr.toString().trim()}`);
  }

  console.log(`wrote ${SCHEMA_PATH}`);
}
