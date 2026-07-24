import { describe, it, expect } from 'vitest';
import { balanceRating } from '../lib/core/health';
import { palateMatchScore } from '../lib/core/taste';
import type { RecipeInput } from '../lib/core/types';

function recipe(over: Partial<RecipeInput>): RecipeInput {
  return { id: 'r', title: 'Test', servings: 2, time_estimate: 20, ingredients: [], ...over };
}

describe('Balance rating (clean but not restrictive)', () => {
  it('veg + clean protein with no refined base = Powerhouse', () => {
    const r = balanceRating(
      recipe({
        title: 'Sheet-pan chicken, sweet potato & broccoli',
        ingredients: [{ name: 'chicken' }, { name: 'sweet potato' }, { name: 'broccoli' }],
      }),
    )!;
    expect(r.tier).toBe('powerhouse');
    expect(r.good).toEqual(expect.arrayContaining(['vegetables', 'clean protein']));
  });

  it('a noodle dish with veg + protein is tempered to Balanced', () => {
    const r = balanceRating(
      recipe({
        title: 'Pad see ew',
        ingredients: [{ name: 'rice noodles' }, { name: 'chicken' }, { name: 'chinese broccoli' }],
        tags: ['noodles'],
      }),
    )!;
    expect(r.tier).toBe('balanced');
  });

  it('a rich, protein-y dish is Hearty — not shamed as a treat', () => {
    const r = balanceRating(
      recipe({
        title: 'French onion soup',
        ingredients: [{ name: 'onion' }, { name: 'butter' }, { name: 'gruyere' }, { name: 'crostini' }],
      }),
    )!;
    expect(r.tier).toBe('hearty');
  });

  it('a PB&J is honestly a Treat, with an enjoy-it nudge', () => {
    const r = balanceRating(
      recipe({ title: 'PB&J sandwich', ingredients: [{ name: 'bread' }, { name: 'peanut butter' }, { name: 'jam' }] }),
    )!;
    expect(r.tier).toBe('treat');
    expect(r.nudge?.toLowerCase()).toContain('enjoy');
  });

  it('does NOT dock butter/sugar as seasoning', () => {
    const r = balanceRating(
      recipe({ title: 'Miso butter salmon with greens', ingredients: [{ name: 'salmon' }, { name: 'butter' }, { name: 'spinach' }, { name: 'sugar' }] }),
    )!;
    expect(r.tier).toBe('powerhouse'); // salmon + spinach carry it; butter/sugar ignored
  });

  it('skips cocktails (not graded on this axis)', () => {
    expect(balanceRating(recipe({ kind: 'cocktail', title: 'Negroni' }))).toBeNull();
  });
});

describe('expanded palate', () => {
  it('credits the wider cuisine range and umami they love', () => {
    expect(palateMatchScore(recipe({ title: 'Gochujang glazed chicken', ingredients: [{ name: 'gochujang' }, { name: 'chicken thigh' }], tags: ['korean'] }))).toBeGreaterThan(0.5);
    expect(palateMatchScore(recipe({ title: 'Coq au vin', ingredients: [{ name: 'butter' }, { name: 'thyme' }, { name: 'wine' }], tags: ['french'] }))).toBeGreaterThan(0.2);
    expect(palateMatchScore(recipe({ title: 'Kewpie egg salad', ingredients: [{ name: 'kewpie mayo' }, { name: 'egg' }] }))).toBeGreaterThan(0.2);
  });
});
