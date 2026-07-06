// Pure event/item builders. No localStorage, no React — just data in, events out.
// The store (lib/store/miseStore.ts) wires these to persistence; tests hit them directly.

import type {
  InventoryItem,
  InventoryEvent,
  Actor,
  EventType,
  EventSource,
  RecipeInput,
} from '../core/types';
import type { ParsedItem } from '../ai/provider';
import { normalizeName } from '../core/normalize';

export interface Ctx {
  id: () => string;
  now: () => string;
}

let _seq = 0;
export const defaultCtx: Ctx = {
  id: () =>
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now().toString(36)}-${(_seq++).toString(36)}`,
  now: () => new Date().toISOString(),
};

/** A parsed item after the human has reviewed it on the Confirm screen. */
export type ConfirmedItem = ParsedItem;

function makeEvent(
  item_id: string,
  household_id: string,
  event_type: EventType,
  quantity_change: number,
  actor: Actor,
  source: EventSource,
  ctx: Ctx,
  reason?: string,
): InventoryEvent {
  return {
    id: ctx.id(),
    item_id,
    household_id,
    event_type,
    quantity_change,
    reason: reason ?? null,
    source,
    actor,
    created_at: ctx.now(),
  };
}

/**
 * Fold confirmed scan items into the existing inventory.
 * Matches existing items by normalized_name + location → appends a restock event
 * (merge, never clobber). Otherwise creates a new item + an "added" event.
 */
export function ingestConfirmed(
  existing: InventoryItem[],
  confirmed: ConfirmedItem[],
  household_id: string,
  actor: Actor,
  ctx: Ctx = defaultCtx,
  source: EventSource = 'receipt',
): { newItems: InventoryItem[]; events: InventoryEvent[] } {
  const newItems: InventoryItem[] = [];
  const events: InventoryEvent[] = [];
  // Build a mutable index so multiple confirmed lines for the same thing merge too.
  const index = new Map<string, string>(); // name|loc -> item_id
  for (const it of existing) index.set(`${it.normalized_name}|${it.location}`, it.id);

  for (const c of confirmed) {
    const key = `${c.normalized_name}|${c.location}`;
    const existingId = index.get(key);
    if (existingId) {
      events.push(
        makeEvent(existingId, household_id, 'restocked', c.quantity, actor, source, ctx, 'restock'),
      );
      continue;
    }
    const now = ctx.now();
    const item: InventoryItem = {
      id: ctx.id(),
      household_id,
      normalized_name: c.normalized_name,
      display_name: c.display_name,
      category: c.category,
      unit: c.unit,
      location: c.location,
      brand: c.brand ?? null,
      package_size: c.package_size ?? null,
      purchase_date: now.slice(0, 10),
      opened_date: null,
      source,
      confidence_score: c.confidence ?? null,
      notes: null,
      created_at: now,
      updated_at: now,
    };
    newItems.push(item);
    index.set(key, item.id);
    events.push(makeEvent(item.id, household_id, 'added', c.quantity, actor, item.source, ctx, 'add'));
  }

  return { newItems, events };
}

/** Consume some quantity of an item (e.g. used one). */
export function consumeEvent(
  item: Pick<InventoryItem, 'id' | 'household_id'>,
  qty: number,
  actor: Actor,
  ctx: Ctx = defaultCtx,
): InventoryEvent {
  return makeEvent(item.id, item.household_id, 'consumed', -Math.abs(qty), actor, 'manual', ctx, 'used');
}

/** Toss it — discard the full remaining quantity. */
export function discardEvent(
  item: Pick<InventoryItem, 'id' | 'household_id'>,
  remaining: number,
  actor: Actor,
  ctx: Ctx = defaultCtx,
): InventoryEvent {
  return makeEvent(item.id, item.household_id, 'discarded', -Math.abs(remaining), actor, 'manual', ctx, 'tossed');
}

/**
 * Cooking a recipe consumes one unit of each on-hand ingredient it uses.
 * `present` is the set of currently-on-hand items (already derived).
 */
export function cookEvents(
  recipe: Pick<RecipeInput, 'ingredients'>,
  present: InventoryItem[],
  household_id: string,
  actor: Actor,
  ctx: Ctx = defaultCtx,
): InventoryEvent[] {
  const byName = new Map<string, InventoryItem>();
  for (const p of present) if (!byName.has(p.normalized_name)) byName.set(p.normalized_name, p);

  const events: InventoryEvent[] = [];
  for (const ing of recipe.ingredients) {
    const name = ing.normalized_name ?? normalizeName(ing.name).name;
    const item = byName.get(name);
    if (item) {
      events.push(
        makeEvent(item.id, household_id, 'consumed', -1, actor, 'recipe', ctx, 'cooked'),
      );
    }
  }
  return events;
}
