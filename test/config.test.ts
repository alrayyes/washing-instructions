import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  chartToJson,
  configFromJson,
  configToJson,
  DIST_MACHINE,
  parseConfig,
  parseInstructions,
} from "@washy-washy/core";
import { loadConfig, resolveConfig } from "../src/config";
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

describe("resolveConfig", () => {
  test("prefers your own file when it is there", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    const mine = join(dir, "washy-washy.json");
    await writeFile(mine, "");
    await writeFile(`${mine}.dist`, "");

    expect(await resolveConfig(mine)).toBe(mine);
  });

  // A fresh clone has only the .dist: the real file is gitignored, because it
  // describes one household's laundry and nobody else's.
  test("falls back to the .dist when it is not", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    const mine = join(dir, "washy-washy.json");
    await writeFile(`${mine}.dist`, "");

    expect(await resolveConfig(mine)).toBe(`${mine}.dist`);
  });

  test("complains about a named file that is not there, rather than substituting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    await expect(resolveConfig(join(dir, "nope.json"))).rejects.toThrow(/nope\.json/);
  });
});

describe("loadConfig", () => {
  test("reads a config from a file", async () => {
    const chart = parseInstructions(csv(), machine);
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    const file = join(dir, "washy-washy.json");
    await writeFile(file, configToJson({ machine, chart }));

    const loaded = await loadConfig(file);
    expect(loaded.file).toBe(file);
    expect(loaded.config.machine.washer.name).toBe(machine.washer.name);
    expect(loaded.config.chart).toHaveLength(1);
  });

  // Same rule as the chart: your own file is gitignored, so a fresh clone has
  // only the .dist beside it.
  test("falls back to the committed .dist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    const distFile = join(dir, "washy-washy.json.dist");
    const chart = parseInstructions(csv(), machine);
    await writeFile(distFile, configToJson({ machine, chart }));

    const loaded = await loadConfig(join(dir, "washy-washy.json"));
    expect(loaded.file).toBe(distFile);
  });

  test("says which file it could not read", async () => {
    await expect(loadConfig("no/such/washy-washy.json")).rejects.toThrow(
      /no\/such\/washy-washy\.json/,
    );
  });

  test("names the specific field that is wrong, same as parseConfig", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-"));
    const file = join(dir, "washy-washy.json");
    await writeFile(file, JSON.stringify({ machine }));

    await expect(loadConfig(file)).rejects.toThrow(/chart is missing/);
  });
});
