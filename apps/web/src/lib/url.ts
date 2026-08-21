import { type Variant, variants } from "@washy-washy/core/browser";
import type { StoredFilters } from "./storage";

function isVariant(value: string | null): value is Variant {
  return value !== null && (variants as readonly string[]).includes(value);
}

/**
 * Filter state carried in the URL's query string — what makes a filtered
 * view shareable by copying the address bar. Only the fields actually
 * present are returned: a URL with neither param means "nothing to apply
 * from the URL", not "apply the defaults", so the caller can tell that
 * apart from a link that explicitly asks for the bundled/default view.
 *
 * Kept in its own file, apart from the `window`-touching write side
 * (`urlHistory.ts`): the root tsconfig has no DOM lib (`apps/web` is
 * excluded from it precisely because it needs one), and a plain function
 * like this one is worth unit-testing from the root `test/` suite — which
 * only works because nothing in this file's module graph reaches `window`.
 */
export function readUrlFilters(search: string): Partial<StoredFilters> {
  const params = new URLSearchParams(search);
  const cut = params.get("cut");
  const pile = params.get("pile");
  const filters: Partial<StoredFilters> = {};
  if (isVariant(cut)) filters.cut = cut;
  if (pile !== null) filters.pileQuery = pile;
  return filters;
}
