import { describe, it, expect } from 'vitest';
import { deriveEffort, filterRecipes } from '../lib/core/effort';
import type { RecipeInput } from '../lib/core/types';

function r(over: Partial<RecipeInput>): RecipeInput {
  return { id: 'r', title: 'Test', servings: 2, time_estimate: 20, ingredients: [], ...over };
}

describe('deriveEffort', () => {
  it('respects an explicit effort', () => {
    expect(deriveEffort(r({ effort: 'involved', title: 'Toast' }))).toBe('involved');
  });
  it('flags projects by keyword (fresh pasta, injera)', () => {
    expect(deriveEffort(r({ title: 'Fresh pasta with sage butter' }))).toBe('involved');
    expect(deriveEffort(r({ title: 'Doro wat with injera', tags: ['ethiopian'] }))).toBe('involved');
  });
  it('flags a long method as involved', () => {
    expect(deriveEffort(r({ steps: new Array(11).fill('do a thing') }))).toBe('involved');
  });
  it('defaults short weeknight dishes to easy', () => {
    expect(deriveEffort(r({ title: 'Zucchini & egg fried rice', steps: ['a', 'b', 'c'] }))).toBe('easy');
  });
});

describe('filterRecipes (time + effort dials)', () => {
  const pool = [
    r({ id: 'quick', time_estimate: 15 }),
    r({ id: 'medium', time_estimate: 45 }),
    r({ id: 'long-easy', time_estimate: 90, steps: ['a'] }),
    r({ id: 'project', time_estimate: 120, effort: 'involved' }),
  ];

  it('filters by time', () => {
    expect(filterRecipes(pool, { maxMinutes: 30 }).map((x) => x.id)).toEqual(['quick']);
    expect(filterRecipes(pool, { maxMinutes: 60 }).map((x) => x.id)).toEqual(['quick', 'medium']);
  });
  it('filters by effort independently of time', () => {
    expect(filterRecipes(pool, { effort: 'involved' }).map((x) => x.id)).toEqual(['project']);
    expect(filterRecipes(pool, { effort: 'easy' }).map((x) => x.id)).toEqual([
      'quick',
      'medium',
      'long-easy',
    ]);
  });
  it('combines both dials', () => {
    expect(filterRecipes(pool, { maxMinutes: 60, effort: 'easy' }).map((x) => x.id)).toEqual([
      'quick',
      'medium',
    ]);
  });
  it('no filters returns everything', () => {
    expect(filterRecipes(pool, {})).toHaveLength(4);
  });
});
