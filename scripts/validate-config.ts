/**
 * Validates a config file the same way `bun run generate` would when
 * loading it — a thin wrapper over `loadConfig`, which already gives full
 * semantic validation: every machine-facing value in the chart is checked
 * against the machine embedded in the same file, naming the specific
 * row/column that's wrong. No separate JSON Schema walker — the schema
 * (`CONFIG_SCHEMA_URL`, from `@washy-washy/core`) is for editor autocomplete,
 * not a second source of truth for correctness.
 *
 * Defaults to `data/washy-washy.json`, resolved the same way `generate`
 * resolves it — your own file if you have one, the committed `.dist`
 * otherwise. On a fresh checkout with no file of your own, that means this
 * also doubles as the drift check between the committed `.dist` and
 * whatever `@washy-washy/core` actually accepts.
 */
import { loadConfig } from "../src/config";

export const DEFAULT_PATH = "data/washy-washy.json";

if (import.meta.main) {
  const [path = DEFAULT_PATH] = Bun.argv.slice(2);

  try {
    const { file, config } = await loadConfig(path);
    console.log(
      `${file} is valid: ${config.chart.length} piles, drawn for ` +
        `${config.machine.washer.name} · ${config.machine.iron.name}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
