import { type Config, configFromJson } from "@washy-washy/core";

/**
 * Which file to actually read. `data/washy-washy.json` describes one
 * household's laundry and is gitignored, so a fresh clone has only the
 * `.dist` beside it — fall back to that rather than failing on a checkout
 * that is perfectly fine. Falling back needs a `.dist` to exist, so naming a
 * file that simply is not there still fails, which is what you want when you
 * meant your own config and mistyped it.
 */
export async function resolveConfig(path: string): Promise<string> {
  if (await Bun.file(path).exists()) return path;
  if (await Bun.file(`${path}.dist`).exists()) return `${path}.dist`;
  throw new Error(`no such file: ${path}`);
}

/**
 * Resolves, reads and validates a config file, returning the file it
 * actually read alongside the parsed config — the caller needs that path
 * too, to name the output after it and to say where it read from.
 */
export async function loadConfig(path: string): Promise<{ file: string; config: Config }> {
  const file = await resolveConfig(path);
  const source = await Bun.file(file).text();
  try {
    return { file, config: configFromJson(source) };
  } catch (error) {
    throw new Error(
      `${file}: ${error instanceof Error ? error.message.replace(/^config: /, "") : error}`,
    );
  }
}
