import { describe, it, expect } from 'vitest';
import { deriveInventory, presentItems } from '../lib/core/inventory';
import type { InventoryItem, InventoryEvent } from '../lib/core/types';

function item(id: string, over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id,
    household_id: 'h1',
    normalized_name: 'cucumber',
    display_name: 'Cucumber',
    category: 'produce',
    unit: 'unit',
    location: 'fridge',
    source: 'manual',
    created_at: '2026-06-18T10:00:00Z',
    updated_at: '2026-06-18T10:00:00Z',
    ...over,
  };
}

function ev(over: Partial<InventoryEvent>): InventoryEvent {
  return {
    id: Math.random().toString(36).slice(2),
    item_id: 'i1',
    household_id: 'h1',
    event_type: 'added',
    quantity_change: 1,
    source: 'manual',
    actor: 'marc',
    created_at: '2026-06-18T10:00:00Z',
    ...over,
  };
}

describe('inventory (event-sourced, derived state)', () => {
  it('derives current quantity by summing the event log', () => {
    const items = [item('i1')];
    const events = [
      ev({ item_id: 'i1', event_type: 'added', quantity_change: 3 }),
      ev({ item_id: 'i1', event_type: 'consumed', quantity_change: -1 }),
    ];
    const [d] = deriveInventory(items, events);
    expect(d!.quantity_remaining).toBe(2);
    expect(d!.is_present).toBe(true);
    expect(d!.event_count).toBe(2);
  });

  it('reconciles two-phone concurrent edits without clobbering (sum is order-independent)', () => {
    const items = [item('i1')];
    const marc = ev({ item_id: 'i1', actor: 'marc', event_type: 'consumed', quantity_change: -1, created_at: '2026-06-20T08:00:00Z' });
    const anna = ev({ item_id: 'i1', actor: 'anna', event_type: 'consumed', quantity_change: -1, created_at: '2026-06-20T08:00:05Z' });
    const added = ev({ item_id: 'i1', quantity_change: 3, created_at: '2026-06-18T10:00:00Z' });

    const order1 = deriveInventory(items, [added, marc, anna])[0]!;
    const order2 = deriveInventory(items, [anna, added, marc])[0]!;
    expect(order1.quantity_remaining).toBe(order2.quantity_remaining);
    expect(order1.quantity_remaining).toBe(1);
    expect(order1.last_event_at).toBe('2026-06-20T08:00:05Z'); // monotonic latest
  });

  it('never displays negative quantity, but counts every event (no silent loss)', () => {
    const items = [item('i1')];
    const events = [
      ev({ item_id: 'i1', quantity_change: 1 }),
      ev({ item_id: 'i1', event_type: 'consumed', quantity_change: -1 }),
      ev({ item_id: 'i1', event_type: 'consumed', quantity_change: -1 }), // stale double-consume
    ];
    const [d] = deriveInventory(items, events);
    expect(d!.quantity_remaining).toBe(0);
    expect(d!.is_present).toBe(false);
    expect(d!.event_count).toBe(3);
  });

  it('presentItems filters to on-hand only', () => {
    const items = [item('i1'), item('i2', { normalized_name: 'salmon' })];
    const events = [
      ev({ item_id: 'i1', quantity_change: 2 }),
      ev({ item_id: 'i2', quantity_change: 1 }),
      ev({ item_id: 'i2', event_type: 'consumed', quantity_change: -1 }),
    ];
    const present = presentItems(deriveInventory(items, events));
    expect(present.map((p) => p.id)).toEqual(['i1']);
  });
});
