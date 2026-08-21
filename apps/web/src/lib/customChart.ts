import {
  chartFromJson,
  chartToJson,
  type Instruction,
  type Machine,
} from "@washy-washy/core/browser";

const KEY = "washy-washy:chart";

/**
 * A previously uploaded chart, read back for a returning visit.
 *
 * Re-validated against the current machine on every read, the same as a
 * fresh upload — not just trusted because it was valid when it was written.
 * That also covers the machine file itself changing (a renamed programme)
 * between visits: a chart that no longer fits falls back to the bundled one
 * instead of rendering nonsense, the same as any other storage failure here.
 */
export function readCustomChart(machine: Machine): Instruction[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    return chartFromJson(raw, machine);
  } catch {
    return null;
  }
}

export function writeCustomChart(instructions: Instruction[]): void {
  try {
    localStorage.setItem(KEY, chartToJson(instructions));
  } catch {
    // Private browsing, a full quota, or no storage at all — the upload
    // still renders for this visit, it just isn't remembered next time.
  }
}

export function clearCustomChart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do if storage itself is unavailable — there was nothing
    // reliably stored to begin with.
  }
}
