'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, StatusChip } from './ui';
import { Toolbar } from './controls';
import { useMise } from '../lib/store/useMise';
import { freezeTip } from '../lib/core/freeze';
import { balanceRating } from '../lib/core/health';
import type { RankedRecipe } from '../lib/core/ranker';
import type { SpoilageStatus } from '../lib/core/spoilage';

function whyLine(useSoonDisplay: string[], usedCount: number): string {
  if (useSoonDisplay.length === 1) return `Uses your ${useSoonDisplay[0]} before it turns`;
  if (useSoonDisplay.length > 1)
    return `Uses ${useSoonDisplay.slice(0, 2).join(' & ')} before they turn`;
  if (usedCount > 0) return `Uses ${usedCount} thing${usedCount === 1 ? '' : 's'} you already have`;
  return 'A solid weeknight option';
}

function RecipeCard({
  r,
  disp,
  statusOf,
  onCook,
  onRemove,
}: {
  r: RankedRecipe;
  disp: (n: string) => string;
  statusOf: (n: string) => SpoilageStatus;
  onCook: () => void;
  onRemove?: () => void;
}) {
  const useSoonDisplay = r.use_soon_items.map(disp);
  const otherUsed = r.inventory_items_used.filter((n) => !r.use_soon_items.includes(n));
  const rating = balanceRating(r);
  const n = r.nutrition;
  return (
    <article className="card recipe">
      <div className="title">
        {r.saved && <span className="badge">Yours</span>}
        {r.title}
      </div>
      <div className="why">{whyLine(useSoonDisplay, r.inventory_items_used.length)}</div>

      <div className="meta">
        <span>⏱ {r.time_estimate} min</span>
        <span>🍽 serves {r.servings}</span>
        {r.leftover_score >= 0.5 && <span>♻️ good leftovers</span>}
        {rating && (
          <span className={`chip balance ${rating.tier}`} title={rating.good.join(' · ')}>
            <span className="glyph" aria-hidden>
              {rating.glyph}
            </span>
            {rating.label}
          </span>
        )}
      </div>

      {n && (
        <div className="macros">
          <b>≈ {n.calories}</b> cal · {n.protein_g}g protein · {n.carbs_g}g carbs ·{' '}
          {n.sugar_g}g sugar · {n.fat_g}g fat{n.fiber_g != null ? ` · ${n.fiber_g}g fiber` : ''}
          <span className="est" title="Rough estimate per serving — not exact tracking">
            {' '}est.
          </span>
        </div>
      )}
      {rating?.nudge && <div className="balance-nudge">{rating.nudge}</div>}

      {(r.use_soon_items.length > 0 || otherUsed.length > 0) && (
        <div className="uses">
          {r.use_soon_items.map((n) => (
            <StatusChip key={n} status={statusOf(n)} label={disp(n)} />
          ))}
          {otherUsed.map((n) => (
            <span key={n} className="chip ingredient">
              {disp(n)}
            </span>
          ))}
        </div>
      )}

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

      {((r.steps && r.steps.length > 0) || r.notes) && (
        <details className="method">
          <summary>Method</summary>
          {r.steps && r.steps.length > 0 && (
            <ol className="method-steps">
              {r.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {r.notes && <p className="method-notes">{r.notes}</p>}
        </details>
      )}

      <div className="row-actions">
        <button className="btn btn-primary btn-sm" onClick={onCook}>
          Cooked this
        </button>
        {onRemove && (
          <button className="btn btn-ghost btn-sm" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </article>
  );
}

export default function HomePage() {
  const { snapshot, recipes, yourRecipes, cookRecipe, removeRecipe } = useMise();
  const [msg, setMsg] = useState('');

  const nameToDisplay = new Map(snapshot.map((s) => [s.normalized_name, s.display_name]));
  const nameToStatus = new Map<string, SpoilageStatus>(
    snapshot.map((s) => [s.normalized_name, s.spoilage.status]),
  );
  const disp = (n: string) => nameToDisplay.get(n) ?? n;
  const statusOf = (n: string) => nameToStatus.get(n) ?? 'soon';

  const urgent = snapshot.filter((s) => ['past', 'today', 'soon'].includes(s.spoilage.status));

  function cook(r: RankedRecipe) {
    const { consumed } = cookRecipe(r);
    setMsg(
      consumed > 0
        ? `Cooked “${r.title}” — used ${consumed} item${consumed === 1 ? '' : 's'} from your pantry.`
        : `Cooked “${r.title}”.`,
    );
  }

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

        <div className="section-label">Today · use it up</div>
        {urgent.length > 0 ? (
          <div className="card useup-card">
            {urgent.map((u) => {
              const d = u.spoilage.days_left ?? 0;
              const when =
                d < 0 ? `${Math.abs(d)}d past estimate` : d === 0 ? 'best by today' : `${d}d left`;
              const fz = freezeTip(u.normalized_name, u.location, u.spoilage.status);
              return (
                <div key={u.id} className="useup">
                  <div>
                    <b>{u.display_name}</b> <span className="muted">· {when}</span>
                  </div>
                  {fz.canFreeze && (
                    <div className="freeze">❄️ {fz.text} — if you’re not cooking it soon</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="callout">Nothing urgent — nice. Cook whatever sounds good.</div>
        )}

        {recipes.map((r) => (
          <RecipeCard key={r.id} r={r} disp={disp} statusOf={statusOf} onCook={() => cook(r)} />
        ))}

        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Your recipes</span>
          <Link href="/recipes/new" className="link-btn" style={{ textDecoration: 'none' }}>
            + Add a recipe
          </Link>
        </div>

        {yourRecipes.length === 0 ? (
          <div className="empty">
            No saved recipes yet. <Link href="/recipes/new">Add one</Link> and it’ll live here.
          </div>
        ) : (
          yourRecipes.map((r) => (
            <RecipeCard
              key={r.id}
              r={r}
              disp={disp}
              statusOf={statusOf}
              onCook={() => cook(r)}
              onRemove={() => removeRecipe(r.id)}
            />
          ))
        )}

        <div className="callout">
          <b>Balance</b>, not a diet: the rating rewards veg, fruit &amp; clean protein and nudges
          you to round out the day — but butter, sugar &amp; MSG are fair game where they belong,
          and treats are treats. Macros are rough per-serving estimates.
        </div>
      </div>
    </>
  );
}
