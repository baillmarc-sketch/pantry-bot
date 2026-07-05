'use client';

// Local-first store. localStorage is the source of truth on-device; autosave on
// every mutation (no save buttons). Cross-tab 'storage' events stand in for the
// two-phone case until Supabase lands. The event log is append-only — merge,
// never clobber.

import { useSyncExternalStore } from 'react';
import type { InventoryItem, InventoryEvent, Actor, RecipeInput } from '../core/types';
import { SEED_ITEMS, SEED_EVENTS } from '../fixtures/seed';
import {
  ingestConfirmed,
  consumeEvent,
  discardEvent,
  cookEvents,
  defaultCtx,
  type ConfirmedItem,
} from './actions';

export const HOUSEHOLD = 'h-marc-anna';

const K_ITEMS = 'mise.items.v1';
const K_EVENTS = 'mise.events.v1';
const K_ACTOR = 'mise.actor.v1';
const K_PENDING = 'mise.pendingScan.v1';

interface State {
  items: InventoryItem[];
  events: InventoryEvent[];
  actor: Actor;
}

// Stable initial reference so SSR and the first client render agree (no hydration mismatch).
const SSR_STATE: State = { items: SEED_ITEMS, events: SEED_EVENTS, actor: 'marc' };

let state: State = SSR_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(K_ITEMS, JSON.stringify(state.items));
    localStorage.setItem(K_EVENTS, JSON.stringify(state.events));
    localStorage.setItem(K_ACTOR, state.actor);
  } catch {
    /* storage full / unavailable — keep working from memory */
  }
}

function loadFromStorage(): State | null {
  if (typeof window === 'undefined') return null;
  try {
    const i = localStorage.getItem(K_ITEMS);
    const e = localStorage.getItem(K_EVENTS);
    const a = (localStorage.getItem(K_ACTOR) as Actor) || 'marc';
    if (i && e) return { items: JSON.parse(i), events: JSON.parse(e), actor: a };
  } catch {
    /* corrupt — fall back to seed */
  }
  return null;
}

/** Load real data on the client. Seeds storage on first ever run. Idempotent. */
export function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const loaded = loadFromStorage();
  if (loaded) {
    state = loaded;
  } else {
    persist(); // write the seed so it's stable going forward
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key === K_ITEMS || ev.key === K_EVENTS) {
      const fresh = loadFromStorage();
      if (fresh) {
        state = fresh;
        emit();
      }
    }
  });
  emit();
}

function commit(next: State) {
  state = next;
  persist();
  emit();
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function getSnapshot(): State {
  return state;
}
export function getServerSnapshot(): State {
  return SSR_STATE;
}

// ---- mutations (each one autosaves) ----

export function setActor(actor: Actor) {
  commit({ ...state, actor });
}

export function applyScan(confirmed: ConfirmedItem[]) {
  const { newItems, events } = ingestConfirmed(state.items, confirmed, HOUSEHOLD, state.actor);
  commit({
    ...state,
    items: [...state.items, ...newItems],
    events: [...state.events, ...events],
  });
  return { added: events.length };
}

export function consume(item: InventoryItem, qty = 1) {
  commit({ ...state, events: [...state.events, consumeEvent(item, qty, state.actor)] });
}

export function discard(item: InventoryItem, remaining: number) {
  commit({ ...state, events: [...state.events, discardEvent(item, remaining, state.actor)] });
}

export function cook(recipe: Pick<RecipeInput, 'ingredients'>, present: InventoryItem[]) {
  const events = cookEvents(recipe, present, HOUSEHOLD, state.actor);
  commit({ ...state, events: [...state.events, ...events] });
  return { consumed: events.length };
}

/** Toggle an item on/off the household "things we like" list. Metadata + audit event. */
export function toggleLike(itemId: string) {
  const now = defaultCtx.now();
  let nowLiked = false;
  const items = state.items.map((it) => {
    if (it.id !== itemId) return it;
    nowLiked = !it.liked;
    return { ...it, liked: nowLiked, updated_at: now };
  });
  const event: InventoryEvent = {
    id: defaultCtx.id(),
    item_id: itemId,
    household_id: HOUSEHOLD,
    event_type: 'edited',
    quantity_change: 0,
    reason: nowLiked ? 'liked' : 'unliked',
    source: 'manual',
    actor: state.actor,
    created_at: now,
  };
  commit({ ...state, items, events: [...state.events, event] });
  return { liked: nowLiked };
}

export function resetDemo() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(K_ITEMS);
    localStorage.removeItem(K_EVENTS);
    localStorage.removeItem(K_ACTOR);
    sessionStorage.removeItem(K_PENDING);
  }
  state = { items: SEED_ITEMS, events: SEED_EVENTS, actor: state.actor };
  persist();
  emit();
}

// ---- pending scan (handoff between Scan and Confirm screens) ----

export function setPendingScan(items: ConfirmedItem[]) {
  if (typeof window !== 'undefined') sessionStorage.setItem(K_PENDING, JSON.stringify(items));
}
export function getPendingScan(): ConfirmedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(K_PENDING) ?? '[]');
  } catch {
    return [];
  }
}
export function clearPendingScan() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(K_PENDING);
}

// ---- React binding ----

export function useMiseState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
