import { describe, expect, test } from "bun:test";
import { DIST_MACHINE } from "@washy-washy/core";
import { type JsonSchemaShape, SCHEMA_PATH, validateMachine } from "../scripts/validate-machine";

const schema = (await Bun.file(SCHEMA_PATH).json()) as JsonSchemaShape;
const machine = (await Bun.file(DIST_MACHINE).json()) as Record<string, unknown>;

describe("the committed machine against the committed schema", () => {
  // The schema is published so an editor can autocomplete against it. This is
  // what keeps it honest about the file it is meant to describe.
  test("agrees, property for property", () => {
    expect(validateMachine(machine, schema)).toEqual([]);
  });
});

describe("validateMachine", () => {
  test("catches a missing required property", () => {
    const washer = machine.washer as Record<string, unknown>;
    const { name, ...rest } = washer;
    const broken = { ...machine, washer: rest };
    expect(validateMachine(broken, schema)).toEqual([
      expect.stringContaining('$.washer: missing required property "name"'),
    ]);
  });

  test("catches a property the schema has never heard of", () => {
    const broken = { ...machine, washer: { ...(machine.washer as object), surprise: true } };
    expect(validateMachine(broken, schema).join("\n")).toMatch(
      /\$\.washer: unexpected property "surprise"/,
    );
  });

  test("catches a programme list with too few entries", () => {
    const broken = { ...machine, washer: { ...(machine.washer as object), programs: ["Off"] } };
    expect(validateMachine(broken, schema).join("\n")).toMatch(
      /\$\.washer\.programs: needs at least 2 items, found 1/,
    );
  });

  test("catches a repeated programme", () => {
    const washer = machine.washer as { programs: string[] };
    const broken = {
      ...machine,
      washer: { ...washer, programs: [...washer.programs, washer.programs[0]] },
    };
    expect(validateMachine(broken, schema).join("\n")).toMatch(
      /\$\.washer\.programs: items must be unique/,
    );
  });

  test("catches an iron setting missing its steam flag", () => {
    const iron = machine.iron as { settings: Record<string, unknown>[] };
    const [first, ...rest] = iron.settings;
    const { steam, ...settingWithoutSteam } = first as { steam: boolean };
    const broken = { ...machine, iron: { ...iron, settings: [settingWithoutSteam, ...rest] } };
    expect(validateMachine(broken, schema).join("\n")).toMatch(
      /\$\.iron\.settings\[0\]: missing required property "steam"/,
    );
  });

  test("catches the wrong type outright", () => {
    expect(validateMachine("not an object", schema)).toEqual([
      expect.stringContaining("$: must be an object"),
    ]);
  });
});
