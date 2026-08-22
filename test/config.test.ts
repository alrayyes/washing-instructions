import { describe, expect, test } from "bun:test";
import {
  chartToJson,
  configFromJson,
  configToJson,
  DIST_MACHINE,
  parseConfig,
  parseInstructions,
} from "@washy-washy/core";
import { loadMachine } from "../src/machine";

const machine = await loadMachine(DIST_MACHINE);

const HEADER =
  "clothing_type,detergent,fabric_softener,temperature,spin,duration,program,options," +
  "ironing,ironing_notes,iron_setting,drying,colour_group,mix_tags,notes";

const ROW =
  "Dark,Dark liquid,no,30,800,~2:00,Cottons,Extra Rinse,yes,Inside out,2,Line dry,dark,dye-bleeder,";

function csv(row = ROW): string {
  return `${HEADER}\n${row}\n`;
}

describe("parseConfig", () => {
  test("takes a machine and a chart together", () => {
    const chart = parseInstructions(csv(), machine);
    const config = parseConfig({ machine, chart: JSON.parse(chartToJson(chart)) });

    expect(config.machine.washer.name).toEqual(machine.washer.name);
    expect(config.chart).toHaveLength(1);
    expect(config.chart[0]).toMatchObject({ clothingType: "Dark", program: "Cottons" });
  });

  test("rejects a value that is not an object", () => {
    expect(() => parseConfig("not an object")).toThrow(/must contain an object/);
    expect(() => parseConfig(null)).toThrow(/must contain an object/);
  });

  test("rejects a config missing the machine", () => {
    expect(() => parseConfig({ chart: [] })).toThrow(/machine is missing/);
  });

  test("rejects a config missing the chart", () => {
    expect(() => parseConfig({ machine })).toThrow(/chart is missing/);
  });

  test("rejects a chart that is not an array", () => {
    expect(() => parseConfig({ machine, chart: "nope" })).toThrow(/must be an array of rows/);
  });

  test("names the specific row and column that is wrong, same as instructionsFromRows", () => {
    const chart = parseInstructions(csv(), machine);
    const [row] = JSON.parse(chartToJson(chart));
    row.program = "Not A Programme";

    expect(() => parseConfig({ machine, chart: [row] })).toThrow(/column "program"/);
  });
});

describe("configToJson / configFromJson", () => {
  test("round-trips a config", () => {
    const chart = parseInstructions(csv(), machine);
    const original = { machine, chart };

    const roundTripped = configFromJson(configToJson(original));

    expect(roundTripped).toEqual(original);
  });

  test("rejects invalid JSON", () => {
    expect(() => configFromJson("not json")).toThrow(/not valid JSON/);
  });
});
