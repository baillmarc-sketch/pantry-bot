// Composes the pure engines into one view-ready snapshot. Still framework-free.

import type { InventoryItem, InventoryEvent } from './types';
import { deriveInventory, presentItems, type DerivedItem } from './inventory';
import { spoilageStatus, type SpoilageResult, type SpoilageStatus } from './spoilage';
import type { PantryEntry } from './ranker';

export interface PantryItem extends DerivedItem {
  spoilage: SpoilageResult;
}

const URGENCY: Record<SpoilageStatus, number> = {
  past: 0,
  today: 1,
  soon: 2,
  unknown: 3,
  fresh: 4,
};

/** All present items with spoilage attached, sorted most-urgent first. */
export function pantrySnapshot(
  items: InventoryItem[],
  events: InventoryEvent[],
  todayIso: string,
): PantryItem[] {
  return presentItems(deriveInventory(items, events))
    .map((d) => ({ ...d, spoilage: spoilageStatus(d, todayIso) }))
    .sort(
      (a, b) =>
        URGENCY[a.spoilage.status] - URGENCY[b.spoilage.status] ||
        (a.spoilage.days_left ?? 999) - (b.spoilage.days_left ?? 999),
    );
}

/** Reduce a snapshot to the (name, status) pairs the ranker consumes. */
export function toPantryEntries(snapshot: PantryItem[]): PantryEntry[] {
  return snapshot.map((p) => ({
    normalized_name: p.normalized_name,
    status: p.spoilage.status,
  }));
}
