import { describe, it, expect } from 'vitest';
import { rankRecipes, type PantryEntry } from '../lib/core/ranker';
import { MockAIProvider } from '../lib/ai/mock';
import type { RecipeInput } from '../lib/core/types';

const pantry: PantryEntry[] = [
  { normalized_name: 'salmon', status: 'today' },
  { normalized_name: 'cucumber', status: 'soon' },
  { normalized_name: 'chicken thighs', status: 'fresh' },
  { normalized_name: 'sweet potato', status: 'fresh' },
  { normalized_name: 'zucchini', status: 'fresh' },
];

describe('ranker (expiring-first -> on-hand -> fewest-new -> palate -> leftovers)', () => {
  it('ranks the recipe that uses the most-urgent item first', async () => {
    const recipes = await new MockAIProvider().suggestRecipes({ pantry: [] });
    const ranked = rankRecipes(recipes, pantry);
    expect(ranked.map((r) => r.id)).toEqual([
      'r-salmon-rice', // uses salmon (today) -> top
      'r-cucumber-salad', // uses cucumber (soon)
      'r-chicken-sheet', // all fresh, no urgency
    ]);
    expect(ranked[0]!.use_soon_items).toContain('salmon');
  });

  it('reports inventory used, missing, and a finishing move on every card', async () => {
    const recipes = await new MockAIProvider().suggestRecipes({ pantry: [] });
    const ranked = rankRecipes(recipes, pantry);
    const sheet = ranked.find((r) => r.id === 'r-chicken-sheet')!;
    expect(sheet.inventory_items_used).toEqual(
      expect.arrayContaining(['chicken thighs', 'sweet potato', 'zucchini']),
    );
    // staples (olive oil, lemon) are assumed on hand, not counted missing
    expect(sheet.missing_items).toEqual([]);
    expect(sheet.finishing_move.length).toBeGreaterThan(0);
  });

  it('filters out known-trigger recipes (buttermilk biscuits)', () => {
    const recipes: RecipeInput[] = [
      { id: 'bad', title: 'Buttermilk biscuits', servings: 2, time_estimate: 30, ingredients: [] },
      {
        id: 'ok',
        title: 'Soy salmon',
        servings: 2,
        time_estimate: 20,
        ingredients: [{ name: 'salmon' }],
      },
    ];
    const ranked = rankRecipes(recipes, pantry);
    expect(ranked.map((r) => r.id)).toEqual(['ok']);
  });

  it('honors the limit (Home shows 3-5, not 30)', async () => {
    const recipes = await new MockAIProvider().suggestRecipes({ pantry: [] });
    expect(rankRecipes(recipes, pantry, { limit: 2 })).toHaveLength(2);
  });
});
