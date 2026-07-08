import { describe, it, expect } from 'vitest';
import { freezeTip } from '../lib/core/freeze';

describe('freeze advice (only while still good)', () => {
  it('suggests freezing an at-risk item that freezes well, in months', () => {
    const t = freezeTip('salmon', 'fridge', 'today');
    expect(t.canFreeze).toBe(true);
    expect(t.months).toBe(6); // 180 freezer days
    expect(t.text).toContain('~6 months');
  });

  it('rounds chicken thighs (270d) to ~9 months', () => {
    expect(freezeTip('chicken thighs', 'fridge', 'soon').months).toBe(9);
  });

  it('never suggests freezing once past (spoiled food is not rescued)', () => {
    expect(freezeTip('salmon', 'fridge', 'past').canFreeze).toBe(false);
  });

  it('stays quiet on fresh items and things that do not freeze', () => {
    expect(freezeTip('salmon', 'fridge', 'fresh').canFreeze).toBe(false); // too early
    expect(freezeTip('cucumber', 'fridge', 'today').canFreeze).toBe(false); // no freezer life
    expect(freezeTip('eggs', 'fridge', 'today').canFreeze).toBe(false); // shell eggs: null
  });

  it('does not suggest freezing what is already frozen', () => {
    expect(freezeTip('salmon', 'freezer', 'today').canFreeze).toBe(false);
  });
});
