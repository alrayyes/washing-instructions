import { describe, expect, test } from "bun:test";
import { DIST_MACHINE } from "@washy-washy/core";
import { SCHEMA_PATH, tableSchema } from "../scripts/csv-schema";
import { loadMachine } from "../src/machine";

const machine = await loadMachine(DIST_MACHINE);
const { washer } = machine;

function field(name: string) {
  const found = tableSchema(machine).fields.find((f) => f.name === name);
  if (!found) throw new Error(`no field named ${name}`);
  return found;
}

describe("tableSchema", () => {
  test("takes its allowed values from the appliances, not a second list", () => {
    expect(field("program").constraints?.enum).toEqual([...washer.programs]);
    expect(field("temperature").constraints?.enum).toEqual([...washer.temperatures]);
    expect(field("spin").constraints?.enum).toEqual([...washer.spins]);
  });

  // Table Schema's "array" type means a JSON array in the cell, which is not
  // what `Eco Perfect|Extra spoelen` is. They stay strings, constrained by a
  // pattern built from the same lists, so a validator agrees with the parser.
  test("constrains the pipe-separated columns by pattern, not by type", () => {
    expect(field("options").type).toBe("string");
    const pattern = new RegExp(field("options").constraints?.pattern ?? "$^");

    expect(pattern.test("")).toBe(true);
    expect(pattern.test("Eco")).toBe(true);
    expect(pattern.test("Eco|Extra Rinse")).toBe(true);
    expect(pattern.test("Eco | Extra Rinse")).toBe(true);
    expect(pattern.test("Turbo Wash")).toBe(false);
    expect(pattern.test("Eco|Turbo Wash")).toBe(false);
  });

  test("constrains the mixing tags the same way", () => {
    const pattern = new RegExp(field("mix_tags").constraints?.pattern ?? "$^");

    expect(pattern.test("solo|dye-bleeder")).toBe(true);
    expect(pattern.test("lint-hoarder")).toBe(false);
  });

  test("requires the one column a row cannot do without", () => {
    expect(field("clothing_type").constraints?.required).toBe(true);
    expect(field("notes").constraints?.required).toBeUndefined();
  });

  // The schema is generated so that machine.ts stays the only authority on the
  // appliances. Committing it is what makes it useful to an editor or a
  // validator, and this is what stops the committed copy going stale.
  test("the committed copy is what the generator produces", async () => {
    const committed = await Bun.file(SCHEMA_PATH).json();
    expect(committed).toEqual(tableSchema(machine));
  });
});
