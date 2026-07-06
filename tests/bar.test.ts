import { describe, it, expect } from 'vitest';
import { barFreshness, shakeability, rankCocktails } from '../lib/core/bar';
import { SAVED_RECIPES_SEED } from '../lib/fixtures/recipes';
import { SEED_ITEMS } from '../lib/fixtures/seed';

const COCKTAILS = SAVED_RECIPES_SEED.filter((r) => r.kind === 'cocktail');
const onHand = new Set(SEED_ITEMS.filter((i) => i.location === 'bar').map((i) => i.normalized_name));
const byId = (id: string) => COCKTAILS.find((c) => c.id === id)!;

describe('bar freshness (guidance)', () => {
  it('spirits are shelf-stable; wine/syrup are not', () => {
    expect(barFreshness({ category: 'spirit', opened_date: null }).shelfStable).toBe(true);
    expect(barFreshness({ category: 'bitters', opened_date: null }).shelfStable).toBe(true);
    const wine = barFreshness({ category: 'wine', opened_date: '2026-06-01' });
    expect(wine.shelfStable).toBe(false);
    expect(wine.label.toLowerCase()).toContain('opened');
  });
});

describe('shakeability', () => {
  it('Hugo Spritz is shakeable with the starter bar', () => {
    const s = shakeability(byId('cocktail-hugo-spritz'), onHand);
    expect(s.canMake).toBe(true);
    expect(s.missing).toEqual([]);
  });

  it('Paper Plane and both margaritas are shakeable', () => {
    for (const id of ['cocktail-paper-plane', 'cocktail-margarita-tequila', 'cocktail-margarita-mezcal']) {
      expect(shakeability(byId(id), onHand).canMake).toBe(true);
    }
  });

  it('Negroni is not shakeable — flags the missing bottles', () => {
    const s = shakeability(byId('cocktail-negroni'), onHand);
    expect(s.canMake).toBe(false);
    expect(s.missing).toEqual(expect.arrayContaining(['gin', 'campari', 'sweet vermouth']));
  });

  it('Daiquiri only needs the rum', () => {
    const s = shakeability(byId('cocktail-daiquiri'), onHand);
    expect(s.missing).toEqual(['white rum']);
  });
});

describe('rankCocktails', () => {
  it('puts shakeable-now cocktails first', () => {
    const ranked = rankCocktails(COCKTAILS, onHand);
    const firstUnmakeable = ranked.findIndex((c) => !c.canMake);
    const lastMakeable = ranked.map((c) => c.canMake).lastIndexOf(true);
    expect(lastMakeable).toBeLessThan(firstUnmakeable); // all makeable precede all not
    expect(ranked[0]!.canMake).toBe(true);
  });
});
