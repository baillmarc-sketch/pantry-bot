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

  it('parses method into steps (by line, keeping commas) + strips pasted numbering', () => {
    const res = parseRecipeForm(
      {
        title: 'Sugo',
        ingredients: 'tomatoes',
        steps: '1. Sear the beef, then rest it\n2. Build the sauce\n\n3. Simmer 20 min',
        effort: 'involved',
      },
      'id',
    );
    expect(res.recipe!.steps).toEqual([
      'Sear the beef, then rest it',
      'Build the sauce',
      'Simmer 20 min',
    ]);
    expect(res.recipe!.effort).toBe('involved');
  });

  it('omits steps/effort when not provided', () => {
    const res = parseRecipeForm({ title: 'T', ingredients: 'x' }, 'id');
    expect(res.recipe!.steps).toBeUndefined();
    expect(res.recipe!.effort).toBeUndefined();
  });
});

describe('ranker honors a saved recipe finishing move', () => {
  it('uses the recipe.finishing_move over the taste guess', () => {
    const food = SAVED_RECIPES_SEED.filter((r) => r.kind !== 'cocktail');
    const ranked = rankRecipes(food, []);
    const sugo = ranked.find((r) => r.id === 'saved-porcini-sugo')!;
    expect(sugo.finishing_move).toBe('chili crisp + scallion');
    expect(sugo.saved).toBe(true);
  });

  it('ranker falls back to the taste-engine finishing move when none is set', () => {
    const noFinish = rankRecipes(
      [{ id: 'x', title: 'Soy ginger tofu', servings: 2, time_estimate: 15, ingredients: [{ name: 'tofu' }], tags: ['asian'] }],
      [],
    );
    expect(noFinish[0]!.finishing_move.length).toBeGreaterThan(0);
  });
});
