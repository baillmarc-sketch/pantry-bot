import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../lib/ai/mock.js';

const ai = new MockAIProvider();

describe('MockAIProvider (the swappable seam, $0)', () => {
  it('parses a canned receipt through the $0 dictionary', async () => {
    const r = await ai.parseReceipt({});
    expect(r.items.length).toBe(5);
    const names = r.items.map((i) => i.normalized_name);
    expect(names).toEqual(
      expect.arrayContaining(['cucumber', 'chicken thighs', 'salmon', 'eggs', 'sweet potato']),
    );
    // dictionary hits are high-confidence
    const salmon = r.items.find((i) => i.normalized_name === 'salmon')!;
    expect(salmon.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('routes unknown lines to low confidence (manual confirm)', async () => {
    const r = await ai.parseReceipt({ text: 'DRAGON FRUIT 1EA' });
    expect(r.items[0]!.confidence).toBeLessThan(0.9);
  });

  it('fridge parse is PROPOSE-ONLY — it never deletes', async () => {
    const r = await ai.parseFridge({ imageBase64: 'x' });
    expect(r.observations.length).toBeGreaterThan(0);
    for (const o of r.observations) {
      expect(['still_present', 'looks_low', 'cannot_see']).toContain(o.proposal);
    }
  });

  it('suggestRecipes honors count', async () => {
    expect(await ai.suggestRecipes({ pantry: [], count: 2 })).toHaveLength(2);
  });
});
