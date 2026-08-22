import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateConfig } from "../scripts/migrate-config";
import { DIST_MACHINE, loadMachine } from "../src/machine";

const HEADER =
  "clothing_type,detergent,fabric_softener,temperature,spin,duration,program,options," +
  "ironing,ironing_notes,iron_setting,drying,colour_group,mix_tags,notes";

const ROW =
  "Dark,Dark liquid,no,30,800,~2:00,Cottons,Extra Rinse,yes,Inside out,2,Line dry,dark,dye-bleeder,";

describe("migrateConfig", () => {
  test("combines a machine file and a CSV into one config", async () => {
    const machine = await loadMachine(DIST_MACHINE);
    const dir = await mkdtemp(join(tmpdir(), "migrate-"));
    const csvPath = join(dir, "washing-instructions.csv");
    await writeFile(csvPath, `${HEADER}\n${ROW}\n`);

    const config = await migrateConfig(DIST_MACHINE, csvPath);

    expect(config.machine.washer.name).toBe(machine.washer.name);
    expect(config.chart).toHaveLength(1);
    expect(config.chart[0]).toMatchObject({ clothingType: "Dark", program: "Cottons" });
  });

  test("falls back to the committed .dist for the CSV", async () => {
    const dir = await mkdtemp(join(tmpdir(), "migrate-"));
    const csvPath = join(dir, "washing-instructions.csv");
    await writeFile(`${csvPath}.dist`, `${HEADER}\n${ROW}\n`);

    const config = await migrateConfig(DIST_MACHINE, csvPath);
    expect(config.chart).toHaveLength(1);
  });

  test("says which file it could not read", async () => {
    await expect(migrateConfig(DIST_MACHINE, "no/such/chart.csv")).rejects.toThrow(
      /no\/such\/chart\.csv/,
    );
  });
});
