import { describe, it, expect } from 'vitest';
import {
  ingestConfirmed,
  consumeEvent,
  discardEvent,
  cookEvents,
  type ConfirmedItem,
  type Ctx,
} from '../lib/store/actions';
import { deriveInventory } from '../lib/core/inventory';
import type { InventoryItem } from '../lib/core/types';

// Deterministic ctx for stable ids/timestamps in tests.
function fixedCtx(): Ctx {
  let n = 0;
  return { id: () => `id-${n++}`, now: () => '2026-06-21T12:00:00Z' };
}

function parsed(over: Partial<ConfirmedItem> = {}): ConfirmedItem {
  return {
    normalized_name: 'cucumber',
    display_name: 'Cucumber',
    category: 'produce',
    unit: 'unit',
    quantity: 1,
    location: 'fridge',
    confidence: 0.95,
    ...over,
  };
}

const HH = 'h1';

describe('actions (pure event builders)', () => {
  it('ingests new items with an added event', () => {
    const { newItems, events } = ingestConfirmed([], [parsed({ quantity: 3 })], HH, 'marc', fixedCtx());
    expect(newItems).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0]!.event_type).toBe('added');
    expect(events[0]!.quantity_change).toBe(3);
    expect(newItems[0]!.household_id).toBe(HH);
    expect(newItems[0]!.purchase_date).toBe('2026-06-21');
  });

  it('merges a restock into an existing item (same name + location) — no duplicate item', () => {
    const existing: InventoryItem = {
      id: 'x1',
      household_id: HH,
      normalized_name: 'cucumber',
      display_name: 'Cucumbers',
      category: 'produce',
      unit: 'unit',
      location: 'fridge',
      source: 'manual',
      created_at: '2026-06-20T00:00:00Z',
      updated_at: '2026-06-20T00:00:00Z',
    };
    const { newItems, events } = ingestConfirmed(
      [existing],
      [parsed({ quantity: 2 })],
      HH,
      'anna',
      fixedCtx(),
    );
    expect(newItems).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0]!.event_type).toBe('restocked');
    expect(events[0]!.item_id).toBe('x1');
    expect(events[0]!.quantity_change).toBe(2);
  });

  it('two confirmed lines of the same thing collapse onto one item', () => {
    const { newItems, events } = ingestConfirmed(
      [],
      [parsed({ quantity: 1 }), parsed({ quantity: 2 })],
      HH,
      'marc',
      fixedCtx(),
    );
    expect(newItems).toHaveLength(1); // second line restocks the first
    expect(events.map((e) => e.event_type)).toEqual(['added', 'restocked']);
    // derived total = 1 + 2 = 3
    const derived = deriveInventory(newItems, events);
    expect(derived[0]!.quantity_remaining).toBe(3);
  });

  it('consume and discard produce negative quantity_change', () => {
    const item = { id: 'x1', household_id: HH } as InventoryItem;
    expect(consumeEvent(item, 1, 'marc', fixedCtx()).quantity_change).toBe(-1);
    expect(discardEvent(item, 3, 'anna', fixedCtx()).quantity_change).toBe(-3);
  });

  it('cookEvents consumes one of each on-hand ingredient only', () => {
    const present: InventoryItem[] = [
      { id: 's', household_id: HH, normalized_name: 'salmon' } as InventoryItem,
      { id: 'z', household_id: HH, normalized_name: 'zucchini' } as InventoryItem,
    ];
    const recipe = {
      ingredients: [
        { name: 'salmon' },
        { name: 'zucchini' },
        { name: 'scallion' }, // not on hand -> no event
      ],
    };
    const events = cookEvents(recipe, present, HH, 'marc', fixedCtx());
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.quantity_change === -1 && e.event_type === 'consumed')).toBe(true);
  });
});
