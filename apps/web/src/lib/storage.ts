import { type Variant, variants } from "@washy-washy/core/browser";

const KEY = "washy-washy:filters";

export interface StoredFilters {
  cut: Variant;
  pileQuery: string;
}

function isVariant(value: unknown): value is Variant {
  return typeof value === "string" && (variants as readonly string[]).includes(value);
}

/**
 * The last cut/pile filter, read back for a returning visit.
 *
 * Wrapped in a `try`, not just an availability check: private browsing can
 * throw on `localStorage` itself rather than leaving it `undefined`, a full
 * quota throws on write, and a stray non-JSON or wrong-shaped value under
 * this key (an older format, a manual edit) should be ignored rather than
 * crash the page. Any of those means "nothing to restore", never "the app
 * doesn't load".
 */
export function readFilters(): StoredFilters | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      isVariant((parsed as Record<string, unknown>).cut) &&
      typeof (parsed as Record<string, unknown>).pileQuery === "string"
    ) {
      return parsed as StoredFilters;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeFilters(filters: StoredFilters): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(filters));
  } catch {
    // Private browsing, a full quota, or no storage at all — the filter
    // still works for this visit, it just doesn't carry over to the next.
  }
}
