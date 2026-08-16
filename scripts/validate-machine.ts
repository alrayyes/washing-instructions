/**
 * Checks a machine file against the JSON Schema beside it.
 *
 * `parseMachine` in `src/machine.ts` is the actual gate — it is what the CLI
 * runs before drawing anything. This is not that: it is what keeps
 * `data/machine.schema.json` honest about the file it claims to describe, the
 * same way `validate-csv.ts` keeps the Table Schema honest about the parser.
 * The schema is published for an editor to autocomplete against, so a schema
 * that quietly disagrees with the machine it documents is worse than no
 * schema at all.
 *
 * Written here rather than pulled in from a library: the schema only ever
 * uses object, array, string and boolean, `required`, `additionalProperties`,
 * `minLength`, `minItems` and `uniqueItems`. That subset of JSON Schema is
 * small enough to read in a minute, and a full validator would check drafts
 * and keywords this file never writes.
 */
import { DIST_MACHINE } from "../src/machine";

export const SCHEMA_PATH = "data/machine.schema.json";

export interface JsonSchemaShape {
  type?: string;
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchemaShape>;
  items?: JsonSchemaShape;
  minLength?: number;
  minItems?: number;
  uniqueItems?: boolean;
}

function walk(value: unknown, schema: JsonSchemaShape, path: string, problems: string[]): void {
  switch (schema.type) {
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        problems.push(`${path}: must be an object`);
        return;
      }
      const record = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (!(key in record)) problems.push(`${path}: missing required property "${key}"`);
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(record)) {
          if (!schema.properties?.[key]) problems.push(`${path}: unexpected property "${key}"`);
        }
      }
      for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
        if (key in record) walk(record[key], propertySchema, `${path}.${key}`, problems);
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        problems.push(`${path}: must be an array`);
        return;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        problems.push(`${path}: needs at least ${schema.minItems} items, found ${value.length}`);
      }
      if (schema.uniqueItems) {
        const seen = new Set(value.map((entry) => JSON.stringify(entry)));
        if (seen.size !== value.length) problems.push(`${path}: items must be unique`);
      }
      if (schema.items) {
        value.forEach((entry, index) => {
          walk(entry, schema.items as JsonSchemaShape, `${path}[${index}]`, problems);
        });
      }
      return;
    }
    case "string": {
      if (typeof value !== "string") {
        problems.push(`${path}: must be a string`);
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        problems.push(`${path}: must be at least ${schema.minLength} characters`);
      }
      return;
    }
    case "boolean": {
      if (typeof value !== "boolean") problems.push(`${path}: must be a boolean`);
      return;
    }
    default:
      return;
  }
}

/** Every disagreement between a machine file and its schema, as sentences. */
export function validateMachine(value: unknown, schema: JsonSchemaShape): string[] {
  const problems: string[] = [];
  walk(value, schema, "$", problems);
  return problems;
}

if (import.meta.main) {
  const [machinePath = DIST_MACHINE, schemaPath = SCHEMA_PATH] = Bun.argv.slice(2);

  const problems = validateMachine(
    await Bun.file(machinePath).json(),
    (await Bun.file(schemaPath).json()) as JsonSchemaShape,
  );

  if (problems.length > 0) {
    console.error(`${machinePath} disagrees with ${schemaPath}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`${machinePath} matches ${schemaPath}`);
}
