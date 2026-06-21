'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, StatusChip } from './ui';
import { Toolbar } from './controls';
import { useMise } from '../lib/store/useMise';
import type { SpoilageStatus } from '../lib/core/spoilage';

function whyLine(useSoonDisplay: string[], usedCount: number): string {
  if (useSoonDisplay.length === 1) return `Uses your ${useSoonDisplay[0]} before it turns`;
  if (useSoonDisplay.length > 1)
    return `Uses ${useSoonDisplay.slice(0, 2).join(' & ')} before they turn`;
  if (usedCount > 0) return `Uses ${usedCount} thing${usedCount === 1 ? '' : 's'} you already have`;
  return 'A solid weeknight option';
}

export default function HomePage() {
  const { snapshot, recipes, cookRecipe } = useMise();
  const [msg, setMsg] = useState('');

  const nameToDisplay = new Map(snapshot.map((s) => [s.normalized_name, s.display_name]));
  const nameToStatus = new Map<string, SpoilageStatus>(
    snapshot.map((s) => [s.normalized_name, s.spoilage.status]),
  );
  const disp = (n: string) => nameToDisplay.get(n) ?? n;

  const urgent = snapshot.filter((s) =>
    ['past', 'today', 'soon'].includes(s.spoilage.status),
  );

  return (
    <>
      <Header
        kicker="Mise · Cook this first"
        title="What should we cook?"
        sub="Dinners that use what's about to turn — for Marc & Anna."
      />
      <div className="screen">
        <Toolbar />

        <p aria-live="polite" className="callout" style={{ display: msg ? 'block' : 'none' }}>
          {msg}
        </p>

        {urgent.length > 0 ? (
          <div className="callout">
            <b>Using up:</b>{' '}
            {urgent.map((u, i) => {
              const d = u.spoilage.days_left ?? 0;
              const when = d < 0 ? `${Math.abs(d)}d past` : d === 0 ? 'today' : `${d}d`;
              return (
                <span key={u.id}>
                  {i > 0 ? ' · ' : ''}
                  {u.display_name} ({when})
                </span>
              );
            })}
          </div>
        ) : (
          <div className="callout">Nothing urgent — nice. Cook whatever sounds good.</div>
        )}

        {recipes.length === 0 && (
          <div className="empty">
            Your pantry’s empty. <Link href="/scan">Scan a receipt</Link> to get started.
          </div>
        )}

        {recipes.map((r) => {
          const useSoonDisplay = r.use_soon_items.map(disp);
          const otherUsed = r.inventory_items_used.filter((n) => !r.use_soon_items.includes(n));
          return (
            <article key={r.id} className="card recipe">
              <div className="title">{r.title}</div>
              <div className="why">{whyLine(useSoonDisplay, r.inventory_items_used.length)}</div>

              <div className="meta">
                <span>⏱ {r.time_estimate} min</span>
                <span>🍽 serves {r.servings}</span>
                {r.leftover_score >= 0.5 && <span>♻️ good leftovers</span>}
              </div>

              <div className="uses">
                {r.use_soon_items.map((n) => (
                  <StatusChip key={n} status={nameToStatus.get(n) ?? 'soon'} label={disp(n)} />
                ))}
                {otherUsed.map((n) => (
                  <span key={n} className="chip ingredient">
                    {disp(n)}
                  </span>
                ))}
              </div>

              {r.missing_items.length > 0 && (
                <div className="needs">Still need: {r.missing_items.map(disp).join(', ')}</div>
              )}

              <div className="finish">
                Finishing move: <b>{r.finishing_move}</b>
              </div>

              {r.dairy_warnings.length > 0 && (
                <div className="dairy">
                  ⚠️ {r.dairy_warnings[0]} {r.dairy_swaps[0] ?? ''}
                </div>
              )}

              <div className="row-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const { consumed } = cookRecipe(r);
                    setMsg(
                      consumed > 0
                        ? `Cooked “${r.title}” — used ${consumed} item${consumed === 1 ? '' : 's'} from your pantry.`
                        : `Cooked “${r.title}”.`,
                    );
                  }}
                >
                  Cooked this
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
