// Two dials for "what should we cook": TIME (how long you have) and EFFORT
// (how involved — a quick stir-fry vs. fresh pasta / injera / something new).
// They're independent: French onion soup is long but low-skill.

import type { RecipeInput } from './types';
import { cleanText } from './normalize';

export type Effort = 'easy' | 'involved';

// Signals that a dish is a project, not a weeknight throw-together.
const INVOLVED_SIGNALS = [
  'fresh pasta', 'injera', 'from scratch', 'from-scratch', 'laminate', 'lamination',
  'proof', 'ferment', 'knead', 'confit', 'sous vide', 'temper', 'handmade',
  'project', 'involved', 'braise', 'dumpling', 'terrine', 'pastry', 'croissant',
];

function haystack(recipe: Pick<RecipeInput, 'title' | 'tags' | 'steps'>): string {
  return cleanText([recipe.title, ...(recipe.tags ?? []), ...(recipe.steps ?? [])].join(' '));
}

/**
 * How involved is it? Explicit `effort` wins; otherwise inferred from technique
 * keywords or a long method (many steps = a bigger cooking session).
 */
export function deriveEffort(
  recipe: Pick<RecipeInput, 'effort' | 'title' | 'tags' | 'steps'>,
): Effort {
  if (recipe.effort) return recipe.effort;
  const text = haystack(recipe);
  if (INVOLVED_SIGNALS.some((k) => text.includes(k))) return 'involved';
  if ((recipe.steps?.length ?? 0) >= 9) return 'involved';
  return 'easy';
}

export interface CookFilter {
  /** Max active/total minutes, or null for any. */
  maxMinutes?: number | null;
  /** 'easy' | 'involved' | null for any. */
  effort?: Effort | null;
}

/** Filter a recipe pool by the two dials. */
export function filterRecipes<T extends RecipeInput>(recipes: T[], f: CookFilter): T[] {
  return recipes.filter(
    (r) =>
      (f.maxMinutes == null || r.time_estimate <= f.maxMinutes) &&
      (f.effort == null || deriveEffort(r) === f.effort),
  );
}
