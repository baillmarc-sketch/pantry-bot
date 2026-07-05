// Recipe usefulness scoring. Pure: takes the current pantry (names + spoilage
// status) and recipes, returns them ranked.
//
// Priority order (from the build plan):
//   expiring-first -> most-on-hand -> fewest-new -> palate -> leftovers

import type { RecipeInput } from './types';
import type { SpoilageStatus } from './spoilage';
import { palateMatchScore, dairyAssessment, finishingMoves } from './taste';
import { normalizeName } from './normalize';
import staplesData from '../data/staples.json';

const STAPLES = new Set<string>(staplesData.staples.map((s) => normalizeName(s).name));

export interface PantryEntry {
  normalized_name: string;
  status: SpoilageStatus;
}

export interface RankedRecipe extends RecipeInput {
  inventory_items_used: string[];
  missing_items: string[];
  /** Matched items whose status is soon/today/past — the "saves from going bad" set. */
  use_soon_items: string[];
  palate_match_score: number;
  leftover_score: number;
  finishing_move: string;
  dairy_warnings: string[];
  dairy_swaps: string[];
  score: number;
}

// Weights chosen so the composite ordering follows the stated priority chain.
const W = {
  expirePast: 120,
  expireToday: 90,
  expireSoon: 50,
  coverage: 25, // fraction of ingredients on hand
  missingPenalty: 9, // per missing non-staple ingredient
  palate: 12,
  leftovers: 6,
};

function ingredientName(raw: { name: string; normalized_name?: string }): string {
  return raw.normalized_name ?? normalizeName(raw.name).name;
}

export function rankRecipes(
  recipes: RecipeInput[],
  pantry: PantryEntry[],
  opts: { limit?: number } = {},
): RankedRecipe[] {
  const statusByName = new Map<string, SpoilageStatus>();
  for (const p of pantry) statusByName.set(p.normalized_name, p.status);

  const ranked = recipes
    // Never surface a known-trigger recipe.
    .filter((r) => dairyAssessment(r).ok)
    .map((recipe): RankedRecipe => {
      const used: string[] = [];
      const missing: string[] = [];
      const useSoon: string[] = [];
      let expireScore = 0;

      for (const ing of recipe.ingredients) {
        const name = ingredientName(ing);
        const status = statusByName.get(name);
        if (status) {
          used.push(name);
          if (status === 'past') {
            useSoon.push(name);
            expireScore += W.expirePast;
          } else if (status === 'today') {
            useSoon.push(name);
            expireScore += W.expireToday;
          } else if (status === 'soon') {
            useSoon.push(name);
            expireScore += W.expireSoon;
          }
        } else if (ing.assumed_staple || STAPLES.has(name)) {
          // assumed on hand — neither credit nor penalty
        } else {
          missing.push(name);
        }
      }

      const coverage = recipe.ingredients.length
        ? used.length / recipe.ingredients.length
        : 0;
      const palate = palateMatchScore(recipe);
      const leftover = recipe.leftover_score ?? 0;
      const dairy = dairyAssessment(recipe);

      const score =
        expireScore +
        W.coverage * coverage -
        W.missingPenalty * missing.length +
        W.palate * palate +
        W.leftovers * leftover;

      return {
        ...recipe,
        inventory_items_used: used,
        missing_items: missing,
        use_soon_items: useSoon,
        palate_match_score: Number(palate.toFixed(3)),
        leftover_score: leftover,
        finishing_move: recipe.finishing_move ?? finishingMoves(recipe)[0]!,
        dairy_warnings: dairy.warnings,
        dairy_swaps: dairy.swaps,
        score: Number(score.toFixed(3)),
      };
    });

  ranked.sort((a, b) => b.score - a.score);
  return opts.limit ? ranked.slice(0, opts.limit) : ranked;
}
