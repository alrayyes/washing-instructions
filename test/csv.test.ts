import { describe, expect, test } from "bun:test";
import { parseInstructions } from "../src/csv";
import { DIST_MACHINE, loadMachine } from "../src/machine";

const machine = await loadMachine(DIST_MACHINE);

const HEADER =
  "clothing_type,detergent,fabric_softener,temperature,spin,duration,program,options," +
  "ironing,iron_setting,drying,colour_group,mix_tags,notes";

const ROW =
  "Dark,Dark liquid,no,30,800,~2:00,Cottons,Extra Rinse,Inside out,2,Line dry,dark,dye-bleeder,";

function csv(row = ROW): string {
  return `${HEADER}\n${row}\n`;
}

describe("parseInstructions", () => {
  test("reads a row into an instruction", () => {
    const [item] = parseInstructions(csv(), machine);
    expect(item).toMatchObject({
      clothingType: "Dark",
      fabricSoftener: false,
      temperature: "30",
      spin: "800",
      program: "Cottons",
      options: ["Extra Rinse"],
      ironSetting: "2",
      colourGroup: "dark",
      mixTags: ["dye-bleeder"],
    });
  });

  test("splits pipe-separated options and tags", () => {
    const row = ROW.replace("Extra Rinse", "Eco|Extra Rinse").replace(
      "dye-bleeder",
      "solo|dye-bleeder",
    );
    const [item] = parseInstructions(csv(row), machine);
    expect(item?.options).toEqual(["Eco", "Extra Rinse"]);
    expect(item?.mixTags).toEqual(["solo", "dye-bleeder"]);
  });

  test("accepts an empty options cell", () => {
    const [item] = parseInstructions(csv(ROW.replace(",Extra Rinse,", ",,")), machine);
    expect(item?.options).toEqual([]);
  });

  test("rejects a programme the dial does not have", () => {
    expect(() => parseInstructions(csv(ROW.replace("Cottons", "Turbo Wash")), machine)).toThrow(
      /row 2, column "program"/,
    );
  });

  test("rejects a temperature the machine cannot be set to", () => {
    expect(() => parseInstructions(csv(ROW.replace(",30,", ",35,")), machine)).toThrow(
      /column "temperature"/,
    );
  });

  test("rejects a spin speed the machine cannot be set to", () => {
    expect(() => parseInstructions(csv(ROW.replace(",800,", ",900,")), machine)).toThrow(
      /column "spin"/,
    );
  });

  test("rejects an option button that does not exist", () => {
    expect(() => parseInstructions(csv(ROW.replace("Extra Rinse", "Turbo")), machine)).toThrow(
      /column "options"/,
    );
  });

  test("rejects an unknown mix tag", () => {
    expect(() => parseInstructions(csv(ROW.replace("dye-bleeder", "smelly")), machine)).toThrow(
      /column "mix_tags"/,
    );
  });

  test("rejects a non yes/no softener value", () => {
    expect(() => parseInstructions(csv(ROW.replace(",no,", ",maybe,")), machine)).toThrow(
      /column "fabric_softener"/,
    );
  });

  test("rejects a blank clothing type", () => {
    expect(() =>
      parseInstructions(csv(ROW.replace("Dark,Dark liquid", ",Dark liquid")), machine),
    ).toThrow(/column "clothing_type"/);
  });

  test("names every column it is missing", () => {
    expect(() => parseInstructions("clothing_type,detergent\nDark,Dark liquid\n", machine)).toThrow(
      /missing column\(s\).*fabric_softener/,
    );
  });

  test("rejects a header with no rows", () => {
    expect(() => parseInstructions(`${HEADER}\n`, machine)).toThrow(/no rows/);
  });
});
