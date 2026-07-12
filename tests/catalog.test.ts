import { describe, it, expect } from 'vitest';
import { SAVED_RECIPES_SEED } from '../lib/fixtures/recipes';
import { rankRecipes } from '../lib/core/ranker';

describe('recipe book catalog', () => {
  it('includes the Iced Roasted Sweet Potato with full method steps', () => {
    const r = SAVED_RECIPES_SEED.find((x) => x.id === 'saved-iced-roasted-sweet-potato')!;
    expect(r).toBeTruthy();
    expect(r.steps?.length).toBe(6);
    expect(r.ingredients[0]!.name).toBe('sweet potato');
    expect(r.finishing_move).toContain('salt');
  });

  it('surfaces it as using sweet potato when it is on hand', () => {
    const r = SAVED_RECIPES_SEED.find((x) => x.id === 'saved-iced-roasted-sweet-potato')!;
    const [ranked] = rankRecipes([r], [{ normalized_name: 'sweet potato', status: 'fresh' }]);
    expect(ranked!.inventory_items_used).toContain('sweet potato');
    expect(ranked!.missing_items).toEqual([]);
  });
});
