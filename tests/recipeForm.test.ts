import { describe, it, expect } from 'vitest';
import { parseRecipeForm } from '../lib/store/recipeForm';
import { rankRecipes } from '../lib/core/ranker';
import { SAVED_RECIPES_SEED } from '../lib/fixtures/recipes';

describe('parseRecipeForm', () => {
  it('rejects a recipe with no title or ingredients', () => {
    expect(parseRecipeForm({ title: '', ingredients: '' }, 'x').ok).toBe(false);
    expect(parseRecipeForm({ title: 'X', ingredients: '' }, 'x').errors).toContain(
      'Add at least one ingredient.',
    );
  });

  it('parses lines/commas into normalized ingredients and defaults', () => {
    const res = parseRecipeForm(
      { title: 'Quick Sugo', ingredients: 'crushed tomatoes\nONION\nsoy sauce', tags: 'asian, pasta' },
      'abc',
    );
    expect(res.ok).toBe(true);
    const r = res.recipe!;
    expect(r.id).toBe('saved-quick-sugo-abc');
    expect(r.saved).toBe(true);
    expect(r.servings).toBe(2); // default
    expect(r.time_estimate).toBe(30); // default
    expect(r.ingredients.map((i) => i.normalized_name)).toContain('onion');
    expect(r.tags).toEqual(['asian', 'pasta']);
  });

  it('keeps an explicit finishing move', () => {
    const res = parseRecipeForm(
      { title: 'T', ingredients: 'x', finishing_move: 'chili crisp + scallion' },
      'id',
    );
    expect(res.recipe!.finishing_move).toBe('chili crisp + scallion');
  });
});

describe('ranker honors a saved recipe finishing move', () => {
  it('uses the recipe.finishing_move over the taste guess', () => {
    const [ranked] = rankRecipes(SAVED_RECIPES_SEED, []);
    expect(ranked!.finishing_move).toBe('chili crisp + scallion');
    expect(ranked!.saved).toBe(true);
  });
});
