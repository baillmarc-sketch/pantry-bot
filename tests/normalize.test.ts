import { describe, it, expect } from 'vitest';
import { cleanText, normalizeName } from '../lib/core/normalize.js';

describe('normalize ($0 cost layer)', () => {
  it('cleans qty/unit noise and punctuation', () => {
    expect(cleanText('ORG CUKES 3CT')).toBe('org cukes');
    expect(cleanText('  ATLANTIC  SALMON 0.9LB ')).toBe('atlantic salmon');
  });

  it('maps messy receipt text to a canonical name (matched=true => no model needed)', () => {
    expect(normalizeName('ORG CUKES 3CT')).toEqual({ name: 'cucumber', matched: true });
    expect(normalizeName('BNLS CHX THIGH 2.1LB')).toEqual({
      name: 'chicken thighs',
      matched: true,
    });
    expect(normalizeName('atlantic salmon')).toEqual({ name: 'salmon', matched: true });
  });

  it('flags unknown text as unmatched (would escalate to a model)', () => {
    const r = normalizeName('dragon fruit');
    expect(r.matched).toBe(false);
    expect(r.name).toBe('dragon fruit');
  });
});
