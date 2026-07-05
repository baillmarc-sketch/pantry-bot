import { describe, it, expect } from 'vitest';
import { matches, searchItems, groupByCategory } from '../lib/core/search';
import { SEED_ITEMS } from '../lib/fixtures/seed';
import type { InventoryItem } from '../lib/core/types';

const byName = (n: string) => SEED_ITEMS.find((i) => i.id === n)!;

describe('search', () => {
  it('finds the tinned razor clams by name, brand, category, and tag', () => {
    const clams = byName('i-razor-clams');
    expect(matches(clams, 'clams')).toBe(true);
    expect(matches(clams, 'porto')).toBe(true); // brand
    expect(matches(clams, 'tinned fish')).toBe(true); // category
    expect(matches(clams, 'sea spaghetti')).toBe(true); // tag
    expect(matches(clams, 'galician')).toBe(true); // tag
    expect(matches(clams, 'cracker')).toBe(false);
  });

  it('finds the dill pickle crackers by flavor tag', () => {
    const crackers = byName('i-dill-crackers');
    expect(matches(crackers, 'dill')).toBe(true);
    expect(matches(crackers, 'pickle')).toBe(true);
    expect(matches(crackers, 'crackers')).toBe(true);
  });

  it('tokenized query is AND across fields (all tokens must hit)', () => {
    const clams = byName('i-razor-clams');
    expect(matches(clams, 'garlic clams')).toBe(true);
    expect(matches(clams, 'garlic banana')).toBe(false);
  });

  it('strips qty/unit noise from the query', () => {
    // cleanText removes "3ct"-style tokens; the word should still match
    expect(matches(byName('i-razor-clams'), 'clams 1ct')).toBe(true);
  });

  it('empty query returns everything', () => {
    expect(searchItems(SEED_ITEMS, '')).toHaveLength(SEED_ITEMS.length);
  });

  it('groups by category, sorted, and both liked items land in their categories', () => {
    const liked = SEED_ITEMS.filter((i) => i.liked);
    expect(liked.map((i) => i.id).sort()).toEqual(['i-dill-crackers', 'i-razor-clams']);
    const groups = groupByCategory(liked as InventoryItem[]);
    const cats = groups.map(([c]) => c);
    expect(cats).toEqual(['crackers', 'tinned fish']); // alphabetical
  });
});
