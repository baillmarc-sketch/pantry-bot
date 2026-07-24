// The "Balance" rating — Mise's own health scale, tuned to the house philosophy
// (see lib/core/profile.ts): cleaner & healthier, NOT restrictive. It rewards
// produce and clean protein; it does NOT punish butter/sugar/MSG per se. A treat
// is called a treat, not shamed. The score is transparent (you can see the why).

import type { RecipeInput } from './types';
import { cleanText } from './normalize';

export type BalanceTier = 'powerhouse' | 'balanced' | 'hearty' | 'treat';

export interface BalanceRating {
  tier: BalanceTier;
  label: string;
  glyph: string;
  /** Raw rubric score (higher = more balanced). Shown for transparency. */
  score: number;
  /** What's nourishing about it. */
  good: string[];
  /** A gentle "round out the day" nudge — never a scolding. */
  nudge?: string;
}

export const TIER_META: Record<BalanceTier, { label: string; glyph: string }> = {
  powerhouse: { label: 'Powerhouse', glyph: '◆' },
  balanced: { label: 'Balanced', glyph: '●' },
  hearty: { label: 'Hearty', glyph: '▲' },
  treat: { label: 'Treat', glyph: '★' },
};

const VEG = [
  'broccoli', 'zucchini', 'cucumber', 'spinach', 'gai lan', 'chinese broccoli',
  'tomato', 'pepper', 'greens', 'cabbage', 'mushroom', 'carrot', 'eggplant',
  'kale', 'bok choy', 'sweet potato', 'squash', 'green bean', 'asparagus', 'salad',
];
const FRUIT = ['apple', 'berry', 'banana', 'mango', 'peach', 'citrus', 'pear', 'grape', 'pineapple'];
const LEAN_PROTEIN = [
  'salmon', 'cod', 'fish', 'chicken', 'shrimp', 'tuna', 'tofu', 'tempeh', 'egg',
  'bean', 'lentil', 'chickpea', 'edamame', 'turkey',
];
const LEGUME = ['bean', 'lentil', 'chickpea', 'tofu', 'tempeh', 'edamame'];
const FERMENTED = ['miso', 'gochujang', 'kimchi', 'natto', 'yogurt', 'sauerkraut', 'kefir'];
const WHOLE_GRAIN = ['brown rice', 'quinoa', 'farro', 'oats', 'buckwheat', 'barley', 'whole wheat', 'whole-wheat'];
const ANY_PROTEIN = [
  ...LEAN_PROTEIN, 'beef', 'pork', 'steak', 'lamb', 'duck', 'cheese', 'gruyere',
  'parmesan', 'bacon', 'sausage', 'meatball',
];
const REFINED_CARB = ['noodle', 'pasta', 'white rice', 'bread', 'baguette', 'crostini', 'tortilla', 'bun', 'white flour'];
const FRIED = ['deep-fry', 'deep fried', 'deep-fried', 'tempura', 'katsu', 'fried chicken', 'french fries'];
const PROCESSED_MEAT = ['bacon', 'sausage', 'ham', 'spam', 'salami', 'hot dog', 'pepperoni'];
const DESSERT = ['dessert', 'cake', 'cookie', 'brownie', 'candy', 'ice cream', 'jam', 'pb&j', 'peanut butter and jelly'];

function hits(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function haystack(recipe: Pick<RecipeInput, 'title' | 'ingredients' | 'tags'>): string {
  return cleanText(
    [recipe.title, ...recipe.ingredients.map((i) => i.name), ...(recipe.tags ?? [])].join(' '),
  );
}

/**
 * Rate a recipe on the Balance scale. Cocktails are skipped (return null) —
 * drinks aren't graded on this axis.
 */
export function balanceRating(
  recipe: Pick<RecipeInput, 'title' | 'ingredients' | 'tags' | 'kind'>,
): BalanceRating | null {
  if (recipe.kind === 'cocktail') return null;
  const text = haystack(recipe);

  const hasVeg = hits(text, VEG);
  const hasFruit = hits(text, FRUIT);
  const hasLean = hits(text, LEAN_PROTEIN);
  const hasLegume = hits(text, LEGUME);
  const hasFermented = hits(text, FERMENTED);
  const hasWhole = hits(text, WHOLE_GRAIN);
  const hasAnyProtein = hits(text, ANY_PROTEIN);
  const isRefined = hits(text, REFINED_CARB) && !hasWhole;
  const isFried = hits(text, FRIED);
  const hasProcessed = hits(text, PROCESSED_MEAT);
  const isDessert = hits(text, DESSERT);

  let score = 0;
  const good: string[] = [];
  if (hasVeg) { score += 2; good.push('vegetables'); }
  if (hasFruit) { score += 1; good.push('fruit'); }
  if (hasLean) { score += 2; good.push('clean protein'); }
  if (hasLegume) { score += 1; good.push('plant protein / fiber'); }
  if (hasFermented) { score += 1; good.push('fermented (gut-friendly)'); }
  if (hasWhole) { score += 1; good.push('whole grains'); }
  // We do NOT dock butter / sugar / oil as seasoning — only whole-dish patterns.
  if (isRefined) score -= 1;
  if (isFried) score -= 2;
  if (hasProcessed) score -= 1;
  if (isDessert) score -= 2;

  let tier: BalanceTier;
  // "Treat" only for true indulgences — a dessert, or a dish with no produce AND
  // no protein at all. A rich, protein-y dish is "Hearty," not shamed.
  if (isDessert || (!hasVeg && !hasAnyProtein && !hasLegume)) tier = 'treat';
  else if (score >= 4) tier = 'powerhouse';
  else if (score >= 2) tier = 'balanced';
  else tier = 'hearty';

  let nudge: string | undefined;
  if (tier === 'treat') nudge = 'A treat — enjoy it, just balance the rest of the day.';
  else if (!hasVeg) nudge = 'Add a green side to round it out.';
  else if (!hasFruit) nudge = 'Some fruit later covers the day.';

  return { tier, ...TIER_META[tier], score, good, nudge };
}
