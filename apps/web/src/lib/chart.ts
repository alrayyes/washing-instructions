import {
  type Machine,
  parseInstructions,
  parseMachine,
  type ResolvedInstruction,
  resolve,
} from "@washy-washy/core";

export interface Chart {
  items: ResolvedInstruction[];
  machine: Machine;
}

/**
 * Turns the bundled chart's raw file contents into what the sheet viewer
 * renders from.
 *
 * Takes content rather than reading files itself: the page that calls this
 * pulls the `.dist` CSV and machine in via Vite's own static `?raw` imports,
 * which resolve correctly wherever Rollup ends up placing the built chunk —
 * a path built from this file's own `import.meta.url` at runtime does not,
 * since the prerendered chunk lands at a different depth than the source
 * did. Both come in as raw text: Vite's JSON handling goes by the literal
 * `.json` extension, which `machine.json.dist` does not have.
 */
export function buildChart(csvSource: string, machineSource: string): Chart {
  const machine = parseMachine(JSON.parse(machineSource));
  return { items: resolve(parseInstructions(csvSource, machine)), machine };
}
