/**
 * Checks a CSV against the Table Schema beside it.
 *
 * The parser in `src/csv.ts` already refuses a bad chart, so this is not the
 * gate — it is the check that the *schema* still describes what the parser
 * accepts. Publishing a schema that disagrees with the code is worse than
 * publishing none, because anything that trusts it is quietly wrong.
 *
 * Written here rather than pulled in: frictionless-py is the reference
 * implementation and would put Python in a bun pipeline for one command, and
 * the subset of the spec this schema uses is small enough to read in a minute.
 */
import { parse } from "csv-parse/sync";

export interface SchemaField {
  name: string;
  type: string;
  trueValues?: string[];
  falseValues?: string[];
  constraints?: {
    required?: boolean;
    enum?: string[];
    pattern?: string;
  };
}

export interface TableSchemaShape {
  fields: SchemaField[];
  primaryKey?: string[];
}

/** Every disagreement between a chart and its schema, as sentences. */
export function validateCsv(source: string, schema: TableSchemaShape): string[] {
  let rows: Record<string, string>[];
  try {
    rows = parse(source, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (error) {
    // A ragged row is a disagreement like any other, and a thrown exception
    // would stop the caller learning about the rest of the file.
    return [`the file will not parse as CSV: ${error instanceof Error ? error.message : error}`];
  }
  const problems: string[] = [];

  const header = Object.keys(rows[0] ?? {});
  for (const field of schema.fields) {
    if (!header.includes(field.name)) problems.push(`missing column: ${field.name}`);
  }
  for (const column of header) {
    if (!schema.fields.some((field) => field.name === column)) {
      problems.push(`column not in the schema: ${column}`);
    }
  }

  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    // +2: one for the header row, one because humans count from 1.
    const line = index + 2;

    for (const field of schema.fields) {
      const value = row[field.name] ?? "";
      const where = `row ${line}, column "${field.name}"`;

      if (value === "") {
        if (field.constraints?.required) problems.push(`${where}: required, but empty`);
        continue;
      }

      const allowed = field.constraints?.enum;
      if (allowed && !allowed.includes(value)) {
        problems.push(`${where}: "${value}" is not one of ${allowed.join(", ")}`);
      }

      const pattern = field.constraints?.pattern;
      if (pattern && !new RegExp(pattern).test(value)) {
        problems.push(`${where}: "${value}" does not match ${pattern}`);
      }

      if (field.type === "boolean") {
        const truthy = field.trueValues ?? ["true"];
        const falsy = field.falseValues ?? ["false"];
        if (!truthy.includes(value) && !falsy.includes(value)) {
          problems.push(
            `${where}: "${value}" is neither ${truthy.join("/")} nor ${falsy.join("/")}`,
          );
        }
      }
    }

    for (const key of schema.primaryKey ?? []) {
      const value = row[key] ?? "";
      const first = seen.get(`${key}=${value}`);
      if (first !== undefined) problems.push(`row ${line}: ${key} "${value}" repeats row ${first}`);
      else seen.set(`${key}=${value}`, line);
    }
  });

  return problems;
}

if (import.meta.main) {
  const [
    csvPath = "data/washing-instructions.csv.dist",
    schemaPath = "data/washing-instructions.schema.json",
  ] = Bun.argv.slice(2);

  const problems = validateCsv(
    await Bun.file(csvPath).text(),
    (await Bun.file(schemaPath).json()) as TableSchemaShape,
  );

  if (problems.length > 0) {
    console.error(`${csvPath} disagrees with ${schemaPath}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`${csvPath} matches ${schemaPath}`);
}
