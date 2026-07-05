// Pure text search over inventory/likes. Framework-free, tokenized AND-match
// across the fields a person would actually type.

import type { InventoryItem } from './types';
import { cleanText } from './normalize';

/** The searchable haystack for one item. */
export function searchText(item: InventoryItem): string {
  return cleanText(
    [
      item.display_name,
      item.normalized_name,
      item.brand ?? '',
      item.category,
      item.location,
      ...(item.tags ?? []),
      item.notes ?? '',
    ].join(' '),
  );
}

/** True if every whitespace-separated token in the query appears in the item. */
export function matches(item: InventoryItem, query: string): boolean {
  const q = cleanText(query);
  if (!q) return true;
  const hay = searchText(item);
  return q.split(' ').every((tok) => hay.includes(tok));
}

export function searchItems<T extends InventoryItem>(items: T[], query: string): T[] {
  const q = cleanText(query);
  if (!q) return items;
  return items.filter((i) => matches(i, q));
}

/** Group items by category, categories sorted alphabetically, stable within. */
export function groupByCategory<T extends InventoryItem>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const i of items) {
    const key = i.category || 'other';
    (map.get(key) ?? map.set(key, []).get(key)!).push(i);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
