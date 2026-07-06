// Bar domain — framework-free. Bottle categories, freshness guidance for the
// perishable stuff, and "what can I shake right now" against on-hand bottles.

import type { InventoryItem, RecipeInput } from './types';
import { normalizeName } from './normalize';

export const BAR_CATEGORIES = [
  'spirit',
  'liqueur',
  'amaro',
  'vermouth',
  'wine',
  'bitters',
  'syrup',
  'mixer',
  'juice',
  'garnish',
] as const;
export type BarCategory = (typeof BAR_CATEGORIES)[number];

/** Ingredients we assume are always around, so they never read as "missing". */
export const ASSUMED_BAR_STAPLES = new Set(['ice', 'water', 'salt', 'sugar']);

interface FreshnessRule {
  shelfStable: boolean;
  /** Days after opening to use it, for perishables. */
  openWithinDays?: number;
  note: string;
}

const FRESHNESS: Record<string, FreshnessRule> = {
  spirit: { shelfStable: true, note: 'Shelf-stable — keeps for years.' },
  liqueur: { shelfStable: true, note: 'Keeps a long time; bright/low-proof ones fade over ~1 yr open.' },
  amaro: { shelfStable: true, note: 'Keeps a long time open.' },
  bitters: { shelfStable: true, note: 'Effectively forever.' },
  vermouth: { shelfStable: false, openWithinDays: 60, note: 'Fortified wine — refrigerate once open, ~1–2 months.' },
  wine: { shelfStable: false, openWithinDays: 3, note: 'Refrigerate once open; sparkling goes flat in a day or two.' },
  syrup: { shelfStable: false, openWithinDays: 30, note: 'Refrigerate; simple syrup ~1 month.' },
  mixer: { shelfStable: false, openWithinDays: 14, note: 'Soda/tonic go flat once open.' },
  juice: { shelfStable: false, openWithinDays: 3, note: 'Fresh citrus is best within a couple of days.' },
  garnish: { shelfStable: false, openWithinDays: 5, note: 'Fresh — use while it looks good.' },
};

export interface Freshness {
  shelfStable: boolean;
  label: string;
  note: string;
}

/** Guidance for a bottle (never a guarantee). */
export function barFreshness(item: Pick<InventoryItem, 'category' | 'opened_date'>): Freshness {
  const rule = FRESHNESS[item.category] ?? { shelfStable: true, note: 'Keeps well.' };
  if (rule.shelfStable) return { shelfStable: true, label: 'Shelf-stable', note: rule.note };
  const label = item.opened_date
    ? `Opened — use within ~${rule.openWithinDays}d`
    : `Use within ~${rule.openWithinDays}d once open`;
  return { shelfStable: false, label, note: rule.note };
}

function ingKey(raw: { name: string; normalized_name?: string }): string {
  return raw.normalized_name ?? normalizeName(raw.name).name;
}

export interface Shakeability {
  have: string[];
  missing: string[];
  canMake: boolean;
}

/** What you've got vs. what you still need for one cocktail. */
export function shakeability(
  cocktail: Pick<RecipeInput, 'ingredients'>,
  onHand: Set<string>,
  assumed: Set<string> = ASSUMED_BAR_STAPLES,
): Shakeability {
  const have: string[] = [];
  const missing: string[] = [];
  for (const ing of cocktail.ingredients) {
    const key = ingKey(ing);
    if (onHand.has(key) || assumed.has(key)) have.push(key);
    else missing.push(key);
  }
  return { have, missing, canMake: missing.length === 0 };
}

export interface RankedCocktail extends RecipeInput {
  have: string[];
  missing: string[];
  canMake: boolean;
}

/** Shakeable-now first, then fewest bottles missing, then title. */
export function rankCocktails(
  cocktails: RecipeInput[],
  onHand: Set<string>,
  assumed: Set<string> = ASSUMED_BAR_STAPLES,
): RankedCocktail[] {
  return cocktails
    .map((c) => ({ ...c, ...shakeability(c, onHand, assumed) }))
    .sort(
      (a, b) =>
        Number(b.canMake) - Number(a.canMake) ||
        a.missing.length - b.missing.length ||
        a.title.localeCompare(b.title),
    );
}
