// Freeze advice — "not ready to use it? freeze it, keeps ~N months."
//
// Food-safety honest: only suggest freezing while something is still good
// (soon/today), NEVER once it's 'past' — freezing doesn't rescue spoiled food.

import shelfLifeData from '../data/shelf-life.json';
import { normalizeName } from './normalize';
import type { Location } from './types';
import type { SpoilageStatus } from './spoilage';

const TABLE = shelfLifeData.items as Record<
  string,
  { shelf_life_days: { fridge: number | null; freezer: number | null; pantry: number | null } }
>;

export interface FreezeTip {
  canFreeze: boolean;
  months: number | null;
  text: string | null;
}

const NO_TIP: FreezeTip = { canFreeze: false, months: null, text: null };

function freezerDays(normalized_name: string): number | null {
  const entry = TABLE[normalized_name] ?? TABLE[normalizeName(normalized_name).name];
  return entry?.shelf_life_days?.freezer ?? null;
}

/**
 * Suggest freezing an at-risk item that has a freezer life.
 * Only fires for status 'soon' or 'today', and never when already frozen.
 */
export function freezeTip(
  normalized_name: string,
  location: Location,
  status: SpoilageStatus,
): FreezeTip {
  if (location === 'freezer') return NO_TIP; // already frozen
  if (status !== 'soon' && status !== 'today') return NO_TIP; // too early or too late
  const days = freezerDays(normalized_name);
  if (!days) return NO_TIP; // not a freezer-friendly item (e.g. shell eggs, cucumber)
  const months = Math.max(1, Math.round(days / 30));
  return {
    canFreeze: true,
    months,
    text: `Freeze it — keeps ~${months} month${months === 1 ? '' : 's'}`,
  };
}
