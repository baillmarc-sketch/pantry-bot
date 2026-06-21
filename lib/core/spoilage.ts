// Spoilage status — GUIDANCE, never a safety guarantee.
//
// Hard rules (food safety honesty):
//  - Never render "safe to eat."
//  - Unknown item / unknown storage => 'unknown' (Confirm status), NOT 'fresh'.
//  - When storage or dates are missing, assume the SHORTER shelf life (conservative).

import type { InventoryItem, Location } from './types.js';
import shelfLifeData from '../data/shelf-life.json';
import { normalizeName } from './normalize.js';

export interface ShelfLifeEntry {
  category: string;
  shelf_life_days: { fridge: number | null; freezer: number | null; pantry: number | null };
  after_opened_days: number | null;
  note?: string;
}

const TABLE: Record<string, ShelfLifeEntry> = shelfLifeData.items as Record<
  string,
  ShelfLifeEntry
>;

export type SpoilageStatus = 'fresh' | 'soon' | 'today' | 'past' | 'unknown';

/** Color-INDEPENDENT presentation cues. The view pairs glyph + label, never color alone. */
export const STATUS_META: Record<
  SpoilageStatus,
  { label: string; glyph: string; token: string }
> = {
  fresh: { label: 'Fresh', glyph: '●', token: '--fresh' },
  soon: { label: 'Use soon', glyph: '▲', token: '--soon' },
  today: { label: 'Use today', glyph: '■', token: '--today' },
  past: { label: 'Past estimate — check it', glyph: '◆', token: '--gone' },
  unknown: { label: 'Confirm status', glyph: '?', token: '--gone' },
};

export interface SpoilageResult {
  status: SpoilageStatus;
  /** Whole days until best-before. Negative = past. null when unknown. */
  days_left: number | null;
  /** ISO date (YYYY-MM-DD) or null. */
  best_before: string | null;
  basis: 'opened+shelflife' | 'purchase+shelflife' | 'none';
  /** True when we assumed worst-case because storage/dates were missing. */
  conservative: boolean;
  note?: string;
}

const DAY_MS = 86_400_000;

function toDate(iso: string): Date {
  // Anchor to midnight UTC so day math is stable regardless of tz.
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

function addDays(iso: string, days: number): string {
  const d = new Date(toDate(iso).getTime() + days * DAY_MS);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((toDate(toIso).getTime() - toDate(fromIso).getTime()) / DAY_MS);
}

/** Shortest defined shelf life across storage types — the conservative fallback. */
function shortestDefined(entry: ShelfLifeEntry): number | null {
  const vals = Object.values(entry.shelf_life_days).filter(
    (v): v is number => typeof v === 'number',
  );
  return vals.length ? Math.min(...vals) : null;
}

function lookupEntry(normalized_name: string): ShelfLifeEntry | null {
  if (TABLE[normalized_name]) return TABLE[normalized_name];
  // Be forgiving: run the name back through the alias dictionary.
  const re = normalizeName(normalized_name);
  return (re.name && TABLE[re.name]) || null;
}

/**
 * Compute spoilage status for an item as of `todayIso`.
 * `item` only needs normalized_name, location, purchase_date, opened_date, created_at.
 */
export function spoilageStatus(
  item: Pick<
    InventoryItem,
    'normalized_name' | 'location' | 'purchase_date' | 'opened_date' | 'created_at'
  >,
  todayIso: string,
): SpoilageResult {
  const entry = lookupEntry(item.normalized_name);
  if (!entry) {
    return {
      status: 'unknown',
      days_left: null,
      best_before: null,
      basis: 'none',
      conservative: true,
      note: 'No shelf-life data for this item — confirm by inspection.',
    };
  }

  // Determine base shelf life from storage. Unknown/unsupported storage => shortest.
  let conservative = false;
  const loc = item.location as Location;
  let baseDays: number | null =
    loc in entry.shelf_life_days
      ? entry.shelf_life_days[loc as 'fridge' | 'freezer' | 'pantry'] ?? null
      : null;
  if (baseDays === null) {
    baseDays = shortestDefined(entry);
    conservative = true; // assumed worst-case storage
  }
  if (baseDays === null) {
    return {
      status: 'unknown',
      days_left: null,
      best_before: null,
      basis: 'none',
      conservative: true,
      note: 'No storage shelf-life available — confirm by inspection.',
    };
  }

  // Anchor date: purchase_date preferred; fall back to created_at (conservative).
  const anchor = item.purchase_date ?? item.created_at.slice(0, 10);
  if (!item.purchase_date) conservative = true;

  let bestBefore = addDays(anchor, baseDays);
  let basis: SpoilageResult['basis'] = 'purchase+shelflife';

  // Opened clock can only PULL the date earlier (never later).
  if (item.opened_date && entry.after_opened_days !== null) {
    const openedBest = addDays(item.opened_date, entry.after_opened_days);
    if (daysBetween(openedBest, bestBefore) > 0) {
      bestBefore = openedBest;
      basis = 'opened+shelflife';
    }
  }

  const daysLeft = daysBetween(todayIso, bestBefore);
  const soonWindow = Math.max(3, Math.round(baseDays * 0.25));

  let status: SpoilageStatus;
  if (daysLeft < 0) status = 'past';
  else if (daysLeft <= 1) status = 'today';
  else if (daysLeft <= soonWindow) status = 'soon';
  else status = 'fresh';

  return {
    status,
    days_left: daysLeft,
    best_before: bestBefore,
    basis,
    conservative,
    note: entry.note,
  };
}
