import { describe, it, expect } from 'vitest';
import { palateMatchScore, dairyAssessment, finishingMoves } from '../lib/core/taste';
import type { RecipeInput } from '../lib/core/types';

function recipe(over: Partial<RecipeInput>): RecipeInput {
  return {
    id: 'r',
    title: 'Test',
    servings: 2,
    time_estimate: 20,
    ingredients: [],
    ...over,
  };
}

describe('taste (Marc + Anna as rules)', () => {
  it('boosts on-palate (asian + finishing move) recipes', () => {
    const score = palateMatchScore(
      recipe({
        title: 'Miso salmon with sesame-soy dressing',
        ingredients: [{ name: 'salmon' }, { name: 'miso' }, { name: 'soy sauce' }],
      }),
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('dairy: buttermilk biscuits are a hard NO (ok=false)', () => {
    const a = dairyAssessment(recipe({ title: 'Buttermilk biscuits' }));
    expect(a.ok).toBe(false);
  });

  it('dairy: heavy cream is allowed but warned, with a swap (not dairy-free)', () => {
    const a = dairyAssessment(
      recipe({ title: 'Pasta', ingredients: [{ name: 'heavy cream' }] }),
    );
    expect(a.ok).toBe(true);
    expect(a.warnings.length).toBeGreaterThan(0);
    expect(a.swaps.length).toBeGreaterThan(0);
  });

  it('dairy: aged/goat cheese & butter are fine, no warning', () => {
    const a = dairyAssessment(
      recipe({ title: 'Salad', ingredients: [{ name: 'goat cheese' }, { name: 'butter' }] }),
    );
    expect(a.ok).toBe(true);
    expect(a.warnings.length).toBe(0);
  });

  it('always proposes at least one finishing move', () => {
    expect(finishingMoves(recipe({ title: 'Plain chicken' })).length).toBeGreaterThan(0);
    const asian = finishingMoves(recipe({ title: 'Soy ginger chicken', tags: ['asian'] }));
    expect(asian.length).toBeGreaterThan(0);
  });
});
