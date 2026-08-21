import type { ResolvedInstruction } from "@washy-washy/core/browser";

/**
 * Narrows the chart to piles whose name contains `query`, case-insensitively.
 * An empty or whitespace-only query keeps every pile — that is "no filter
 * applied", not "match nothing".
 */
export function filterByPile(items: ResolvedInstruction[], query: string): ResolvedInstruction[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return items;
  return items.filter((item) => item.clothingType.toLowerCase().includes(needle));
}
