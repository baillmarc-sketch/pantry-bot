// Marc + Anna's palate, encoded as rules (not guesses). The ranker and the recipe
// prompt both read this so suggestions are "ours," not generic.

import type { RecipeInput } from './types';
import { cleanText } from './normalize';

/** Boost keywords by cuisine lean. Matching any raises palate_match_score. */
export const PALATE = {
  asian: [
    'soy',
    'miso',
    'sesame',
    'ginger',
    'garlic',
    'chili crisp',
    'fish sauce',
    'rice vinegar',
    'dashi',
    'gochujang',
    'scallion',
  ],
  med_meast: [
    'shawarma',
    'tahini',
    'lemon',
    'sumac',
    'za\'atar',
    'cumin',
    'yogurt',
    'cucumber',
    'herb',
    'olive',
  ],
  proteins: ['chicken thigh', 'salmon', 'cod', 'steak', 'egg'],
  carbs_veg: ['rice', 'sweet potato', 'zucchini', 'cucumber'],
} as const;

/**
 * Cuisine leanings, per person. We lean Asian but explore ANYTHING — no cuisine
 * is off the table (Ethiopian, wherever). The AI generator reads this to vary
 * suggestions with intent, not randomly.
 */
export const CUISINES = {
  japanese: ['miso', 'dashi', 'shoyu', 'mirin', 'yuzu', 'togarashi', 'katsu', 'nori', 'kewpie', 'furikake'],
  thai: ['fish sauce', 'lime', 'lemongrass', 'thai chili', 'coconut', 'galangal', 'basil', 'tamarind'],
  chinese: ['soy', 'shaoxing', 'oyster sauce', 'sichuan', 'black bean', 'hoisin', 'ginger', 'scallion'],
  korean: ['gochujang', 'gochugaru', 'kimchi', 'sesame', 'doenjang', 'ssamjang'],
  french: ['butter', 'shallot', 'thyme', 'wine', 'dijon', 'tarragon', 'gruyere', 'creme'],
  italian: ['garlic', 'basil', 'parmesan', 'tomato', 'olive oil', 'oregano', 'pancetta'],
} as const;

/** Who leans where — Anna → Japanese; Marc → Thai/Chinese/Korean; both love French & Italian. */
export const FAVORITES = {
  anna: ['japanese'],
  marc: ['thai', 'chinese', 'korean'],
  shared: ['french', 'italian'],
  explore: true, // will try any cuisine
} as const;

/** Always-stocked, Asian-leaning pantry. The generator can assume these on hand. */
export const PANTRY_STAPLES = [
  'sesame oil', 'soy sauce', 'fish sauce', 'rice vinegar', 'gochujang', 'gochugaru',
  'kewpie mayo', 'miso', 'chili crisp', 'oyster sauce', 'msg', 'mirin',
  'jasmine rice', 'short-grain rice', 'garlic', 'ginger', 'scallion', 'butter',
] as const;

/**
 * Seasoning stance: season BOLDLY — lots of spice, umami (MSG, fish sauce). The
 * only time to pull back to just salt & pepper is to let a hero ingredient shine
 * (fresh heirloom tomatoes, great fish). Never suggest bland salt-and-pepper by
 * default.
 */
export const SEASONING_RULE = {
  default: 'bold — spices, umami (MSG welcome), a finishing sauce',
  restraint_only_for: 'a pristine hero ingredient (heirloom tomato, sashimi-grade fish)',
  loves_msg: true,
} as const;

/** Finishing-move library by lean. Simple food should always land *finished*. */
export const FINISHING_MOVES = {
  asian: ['scallion-ginger oil', 'chili crisp + lime', 'miso butter', 'sesame-soy dressing'],
  med_meast: ['lemon-tahini drizzle', 'herb-garlic yogurt', 'quick zhoug', 'sumac onions'],
  default: ['garlic aioli', 'brown-butter vinaigrette', 'salsa verde', 'compound butter'],
} as const;

function haystack(recipe: RecipeInput): string {
  const parts = [recipe.title, ...recipe.ingredients.map((i) => i.name), ...(recipe.tags ?? [])];
  return cleanText(parts.join(' '));
}

/** 0..1 — how well a recipe matches the house palate. */
export function palateMatchScore(recipe: RecipeInput): number {
  const text = haystack(recipe);
  const leanHit = (list: readonly string[]) => list.some((k) => text.includes(k));

  let score = 0;
  if (leanHit(PALATE.asian)) score += 0.4;
  if (leanHit(PALATE.med_meast)) score += 0.4;
  if (leanHit(PALATE.proteins)) score += 0.15;
  if (leanHit(PALATE.carbs_veg)) score += 0.1;
  // Any beloved cuisine (French, Italian, Japanese, Thai, Chinese, Korean) counts.
  if (Object.values(CUISINES).some((list) => leanHit(list))) score += 0.2;
  // Umami they specifically love — MSG, fish sauce, gochujang, kewpie.
  if (/(msg|fish sauce|gochujang|kewpie|umami)/.test(text)) score += 0.15;
  // A "finishing move" present (sauce/dressing/aioli) is a strong taste signal.
  if (/(sauce|aioli|dressing|drizzle|vinaigrette|oil|butter)/.test(text)) score += 0.1;

  return Math.min(1, score);
}

export interface DairyAssessment {
  /** false only for known triggers we must NOT suggest. */
  ok: boolean;
  warnings: string[];
  swaps: string[];
}

/**
 * Dairy rule — NOT dairy-free. A predicate, not a blanket exclude.
 *  ✅ aged/goat/sheep cheese, butter (esp. cultured)  -> fine, no warning
 *  ⚠️ heavy cream / milk-heavy bases                   -> allow but warn + swap
 *  🚫 buttermilk biscuits                              -> known trigger, ok=false
 */
export function dairyAssessment(recipe: RecipeInput): DairyAssessment {
  const text = haystack(recipe);
  const warnings: string[] = [];
  const swaps: string[] = [];

  // Hard trigger.
  if (text.includes('buttermilk biscuit')) {
    return {
      ok: false,
      warnings: ['Buttermilk biscuits are a known no — do not suggest.'],
      swaps: [],
    };
  }

  // Soft warnings for milk-heavy bases.
  if (/(heavy cream|heavy whipping|whipping cream)/.test(text)) {
    warnings.push('Leans on heavy cream.');
    swaps.push('Sub coconut milk, or stock + a knob of cultured butter.');
  } else if (/\bmilk\b/.test(text) && !/coconut milk|oat milk|almond milk/.test(text)) {
    warnings.push('Milk-heavy base.');
    swaps.push('Reduce milk; finish with butter or a splash of stock instead.');
  }

  return { ok: true, warnings, swaps };
}

/** Always returns at least one finishing move — simple food lands finished. */
export function finishingMoves(recipe: RecipeInput): string[] {
  const text = haystack(recipe);
  if (PALATE.asian.some((k) => text.includes(k))) return [...FINISHING_MOVES.asian];
  if (PALATE.med_meast.some((k) => text.includes(k))) return [...FINISHING_MOVES.med_meast];
  return [...FINISHING_MOVES.default];
}
