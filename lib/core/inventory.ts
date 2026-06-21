// Event-sourced inventory derivation.
//
// Current quantity is COMPUTED from the InventoryEvent stream — never stored as a
// mutable truth two phones race against. Concurrent edits are appended events that
// reconcile by summation. Merge, never clobber. Rather double than lose.

import type { InventoryItem, InventoryEvent } from './types';

export interface DerivedItem extends InventoryItem {
  /** Σ quantity_change across this item's events, clamped at 0 for display. */
  quantity_remaining: number;
  /** True while quantity_remaining > 0. */
  is_present: boolean;
  /** ISO timestamp of the most recent event, or created_at if none. */
  last_event_at: string;
  /** How many events fed this derivation (audit signal — nothing silently dropped). */
  event_count: number;
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

/**
 * Fold the event log into current state. Order-independent for quantities (sum),
 * so out-of-order delivery between phones cannot corrupt the total.
 */
export function deriveInventory(
  items: InventoryItem[],
  events: InventoryEvent[],
): DerivedItem[] {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  const latest = new Map<string, string>();

  for (const e of events) {
    sums.set(e.item_id, (sums.get(e.item_id) ?? 0) + e.quantity_change);
    counts.set(e.item_id, (counts.get(e.item_id) ?? 0) + 1);
    const prev = latest.get(e.item_id);
    latest.set(e.item_id, prev ? maxIso(prev, e.created_at) : e.created_at);
  }

  return items.map((item) => {
    const raw = sums.get(item.id) ?? 0;
    const quantity_remaining = Math.max(0, raw); // never display negative; log keeps the truth
    return {
      ...item,
      quantity_remaining,
      is_present: quantity_remaining > 0,
      last_event_at: latest.get(item.id) ?? item.created_at,
      event_count: counts.get(item.id) ?? 0,
    };
  });
}

/** Items currently on hand (present). */
export function presentItems(derived: DerivedItem[]): DerivedItem[] {
  return derived.filter((d) => d.is_present);
}
