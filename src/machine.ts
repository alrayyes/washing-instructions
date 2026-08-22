import { type Machine, parseMachine } from "@washy-washy/core";

/**
 * `@washy-washy/core` doesn't export these two — they're a file-path
 * convention specific to whoever's reading the machine off disk, not
 * something the parser needs to know about. Defined here instead, same
 * names as before the dependency swap.
 */

/** Yours, gitignored. `loadMachine` falls back to the committed `.dist`. */
export const DEFAULT_MACHINE = "data/machine.json";

/**
 * The committed machine, named explicitly.
 *
 * Anything that produces a file for the repository — the tests, the
 * migration script — has to read this rather than `DEFAULT_MACHINE`, or it
 * describes whichever appliances the person running it happens to own.
 */
export const DIST_MACHINE = `${DEFAULT_MACHINE}.dist`;

/**
 * Reads a machine file, falling back to the committed `.dist` beside it when
 * you have not written your own — the same arrangement as the chart, and for
 * the same reason.
 */
export async function loadMachine(path: string): Promise<Machine> {
  const file = (await Bun.file(path).exists()) ? path : `${path}.dist`;
  if (!(await Bun.file(file).exists())) throw new Error(`no such machine file: ${path}`);

  let parsed: unknown;
  try {
    parsed = await Bun.file(file).json();
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }

  try {
    return parseMachine(parsed);
  } catch (error) {
    throw new Error(
      `${file}: ${error instanceof Error ? error.message.replace(/^machine: /, "") : error}`,
    );
  }
}
