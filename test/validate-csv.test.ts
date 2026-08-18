import { describe, expect, test } from "bun:test";
import { DIST_MACHINE } from "@washy-washy/core";
import { SCHEMA_PATH } from "../scripts/csv-schema";
import { type TableSchemaShape, validateCsv } from "../scripts/validate-csv";

const CHART = "data/washing-instructions.csv.dist";

const schema = (await Bun.file(SCHEMA_PATH).json()) as TableSchemaShape;
const chart = await Bun.file(CHART).text();

describe("the committed chart against the committed schema", () => {
  // The schema is published, so anything that trusts it has to be right. The
  // parser is the gate; this is what keeps the schema honest about the gate.
  test("agrees, column for column", () => {
    expect(validateCsv(chart, schema)).toEqual([]);
  });

  test(`is written for ${DIST_MACHINE}, not for whoever generated it`, () => {
    const programs = schema.fields.find((field) => field.name === "program")?.constraints?.enum;
    expect(programs).toContain("Cottons");
  });
});

describe("validateCsv", () => {
  test("names the row and column of a value outside the enum", () => {
    const broken = chart.replace("Cottons", "Turbo Wash");
    expect(validateCsv(broken, schema)).toEqual([
      expect.stringContaining('row 2, column "program": "Turbo Wash"'),
    ]);
  });

  test("catches a pipe-separated cell with an invented button in it", () => {
    const broken = chart.replace(",Extra Rinse,", ",Eco|Turbo,");
    expect(validateCsv(broken, schema).join("\n")).toMatch(/column "options"/);
  });

  // yes and no are what this column has always said, so the schema declares
  // them rather than asking every chart to start writing true and false.
  test("accepts the yes/no this column actually uses", () => {
    expect(validateCsv(chart.replace(",no,", ",false,"), schema)).toEqual([]);
    expect(validateCsv(chart.replace(",no,", ",perhaps,"), schema).join("\n")).toMatch(
      /fabric_softener/,
    );
  });

  test("catches a required cell left empty", () => {
    const broken = chart.replace("\nWhite Socks,", "\n,");
    expect(validateCsv(broken, schema).join("\n")).toMatch(/clothing_type.*required/);
  });

  test("catches two piles with the same name", () => {
    const broken = chart.replace("\nWhite Socks,", "\nWhite,");
    expect(validateCsv(broken, schema).join("\n")).toMatch(/repeats row 2/);
  });

  test("catches a column the schema has never heard of", () => {
    const [header = "", ...rest] = chart.trimEnd().split("\n");
    const broken = [`${header},surprise`, ...rest.map((row) => `${row},extra`)].join("\n");
    expect(validateCsv(broken, schema).join("\n")).toMatch(/column not in the schema: surprise/);
  });

  test("reports a ragged file rather than throwing at the caller", () => {
    const problems = validateCsv(`${chart}\nonly,two\n`, schema);
    expect(problems.join("\n")).toMatch(/will not parse as CSV/);
  });
});
