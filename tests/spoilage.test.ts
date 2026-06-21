import { describe, it, expect } from 'vitest';
import { spoilageStatus, STATUS_META } from '../lib/core/spoilage';

const TODAY = '2026-06-21';

function it_(name: string, over: Record<string, unknown>) {
  return {
    normalized_name: 'cucumber',
    location: 'fridge' as const,
    purchase_date: null,
    opened_date: null,
    created_at: `${name}T10:00:00Z`,
    ...over,
  };
}

describe('spoilage (guidance, conservative, never asserts safe)', () => {
  it('fresh when well within shelf life', () => {
    const r = spoilageStatus(
      it_('2026-06-21', { normalized_name: 'eggs', purchase_date: '2026-06-21' }),
      TODAY,
    );
    expect(r.status).toBe('fresh');
    expect(r.days_left).toBe(28);
  });

  it('soon as best-before approaches', () => {
    const r = spoilageStatus(it_('x', { purchase_date: '2026-06-18' }), TODAY);
    expect(r.status).toBe('soon'); // cucumber: +5d => 06-23, 2 days left
    expect(r.days_left).toBe(2);
  });

  it('today when due within a day', () => {
    const r = spoilageStatus(it_('x', { purchase_date: '2026-06-17' }), TODAY);
    expect(r.status).toBe('today');
    expect(r.days_left).toBe(1);
  });

  it('past once best-before has elapsed (never says "safe")', () => {
    const r = spoilageStatus(it_('x', { purchase_date: '2026-06-15' }), TODAY);
    expect(r.status).toBe('past');
    expect(r.days_left).toBeLessThan(0);
    expect(STATUS_META.past.label).toContain('check it');
  });

  it('unknown item resolves to "unknown" (Confirm status), NOT fresh', () => {
    const r = spoilageStatus(it_('x', { normalized_name: 'dragon fruit' }), TODAY);
    expect(r.status).toBe('unknown');
    expect(r.conservative).toBe(true);
  });

  it('missing purchase_date falls back to created_at, flagged conservative', () => {
    const r = spoilageStatus(
      it_('2026-06-19', { purchase_date: null }), // created_at drives it
      TODAY,
    );
    expect(r.conservative).toBe(true);
    expect(r.best_before).toBe('2026-06-24'); // 06-19 + 5d
  });

  it('unknown storage assumes the SHORTER shelf life (conservative)', () => {
    const r = spoilageStatus(
      it_('x', { normalized_name: 'salmon', location: 'counter', purchase_date: '2026-06-21' }),
      TODAY,
    );
    expect(r.conservative).toBe(true);
    expect(r.days_left).toBe(2); // shortest defined (fridge 2d), not freezer 180d
  });

  it('opened clock can only pull the date EARLIER', () => {
    const r = spoilageStatus(
      {
        normalized_name: 'aged cheese',
        location: 'fridge',
        purchase_date: '2026-06-01', // +42d => 07-13
        opened_date: '2026-06-02', // +21d => 06-23 (earlier, wins)
        created_at: '2026-06-01T10:00:00Z',
      },
      TODAY,
    );
    expect(r.basis).toBe('opened+shelflife');
    expect(r.best_before).toBe('2026-06-23');
    expect(r.status).toBe('soon');
  });

  it('every status has a color-independent glyph + label', () => {
    for (const meta of Object.values(STATUS_META)) {
      expect(meta.glyph.length).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });
});
