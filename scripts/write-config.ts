/**
 * Writes a config through Biome, so the file a command produces already
 * passes `bun run lint` rather than failing it on its own output.
 * `JSON.stringify` (what `configToJson` uses) lays out every array one item
 * per line; Biome's own JSON formatter collapses short ones onto one, and
 * the two disagree until something hands the file over — the same problem
 * the old `csv-schema.ts` solved the same way.
 */
import { type Config, configToJson } from "@washy-washy/core";

export async function writeConfig(path: string, config: Config): Promise<void> {
  await Bun.write(path, configToJson(config));
  const format = Bun.spawnSync(["node_modules/.bin/biome", "format", "--write", path]);
  if (!format.success) {
    throw new Error(`biome could not format ${path}: ${format.stderr.toString().trim()}`);
  }
}
