/**
 * One-off conversion from the old two-file setup — `data/machine.json` and
 * `data/washing-instructions.csv` — to the combined `data/washy-washy.json`.
 * Reads the same fallback-to-`.dist` rule as everything else here, so it
 * works unmodified against either your own files or the committed examples.
 */
import { type Config, parseInstructions } from "@washy-washy/core";
import { loadMachine } from "../src/machine";
import { writeConfig } from "./write-config";

export const DEFAULT_MACHINE_PATH = "data/machine.json";
export const DEFAULT_CSV_PATH = "data/washing-instructions.csv";
export const DEFAULT_OUT_PATH = "data/washy-washy.json";

async function resolveCsv(path: string): Promise<string> {
  if (await Bun.file(path).exists()) return path;
  if (await Bun.file(`${path}.dist`).exists()) return `${path}.dist`;
  throw new Error(`no such file: ${path}`);
}

export async function migrateConfig(machinePath: string, csvPath: string): Promise<Config> {
  const machine = await loadMachine(machinePath);
  const csvFile = await resolveCsv(csvPath);
  const chart = parseInstructions(await Bun.file(csvFile).text(), machine);
  return { machine, chart };
}

if (import.meta.main) {
  const [
    machinePath = DEFAULT_MACHINE_PATH,
    csvPath = DEFAULT_CSV_PATH,
    outPath = DEFAULT_OUT_PATH,
  ] = Bun.argv.slice(2);

  const config = await migrateConfig(machinePath, csvPath);
  await writeConfig(outPath, config);
  console.log(`wrote ${outPath}`);
}
