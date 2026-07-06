'use client';

import { useMemo, useState } from 'react';
import { Header, LikeButton } from '../ui';
import { Toolbar } from '../controls';
import { useMise } from '../../lib/store/useMise';
import { barFreshness, BAR_CATEGORIES } from '../../lib/core/bar';
import { searchItems } from '../../lib/core/search';
import type { RankedCocktail } from '../../lib/core/bar';

const FRAC: Record<string, string> = { '0.75': '¾', '0.5': '½', '0.25': '¼', '0.33': '⅓' };
function amount(q?: number | null, unit?: string | null): string {
  if (q == null) return '';
  const frac = FRAC[String(q)] ?? (Number.isInteger(q) ? String(q) : String(q));
  return `${frac}${unit ? ` ${unit}` : ''}`;
}

const FAVE_LABEL: Record<string, string> = {
  anna: "Anna's fave",
  marc: "Marc's fave",
  both: 'House fave',
};

function CocktailCard({ c }: { c: RankedCocktail }) {
  return (
    <article className="card recipe">
      <div className="title">{c.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
        {c.canMake ? (
          <span className="chip fresh">
            <span className="glyph" aria-hidden>
              ●
            </span>
            Shakeable now
          </span>
        ) : (
          <span className="chip soon">
            <span className="glyph" aria-hidden>
              ▲
            </span>
            Need {c.missing.length}
          </span>
        )}
        {c.favorite_of && <span className="chip" style={{ color: 'var(--chili)' }}>♥ {FAVE_LABEL[c.favorite_of]}</span>}
      </div>

      <ul className="spec">
        {c.ingredients.map((i, idx) => (
          <li key={idx}>
            <span className="amt">{amount(i.quantity, i.unit)}</span>
            <span>{i.name}</span>
          </li>
        ))}
      </ul>

      {!c.canMake && (
        <div className="needs">Need to buy: {c.missing.join(', ')}</div>
      )}

      <div className="finish">
        {c.method} · {c.glass} · Garnish: <b>{c.garnish}</b>
      </div>
      {c.notes && <div className="hint" style={{ marginTop: 8, color: 'var(--ink-soft)', fontSize: 14 }}>{c.notes}</div>}
    </article>
  );
}

function Bottles() {
  const { barBottles, toggleLike, consume, discard, addBottle } = useMise();
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [cat, setCat] = useState<string>('spirit');
  const [size, setSize] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => searchItems(barBottles, q), [barBottles, q]);
  const groups = useMemo(
    () =>
      BAR_CATEGORIES.map((c) => [c, filtered.filter((b) => b.category === c)] as const).filter(
        ([, list]) => list.length > 0,
      ),
    [filtered],
  );

  function submit() {
    if (!name.trim()) return;
    addBottle({ display_name: name, category: cat, package_size: size });
    setName('');
    setSize('');
    setOpen(false);
  }

  return (
    <>
      <input
        type="text"
        inputMode="search"
        placeholder="Search the bar — “aperol”, “syrup”, “smoky”…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search the bar"
      />

      {open ? (
        <div className="card" style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="bname">Bottle</label>
            <input id="bname" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rye whiskey" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="bcat">Category</label>
              <select id="bcat" value={cat} onChange={(e) => setCat(e.target.value)}>
                {BAR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0]!.toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bsize">Size (optional)</label>
              <input id="bsize" type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="750 ml" />
            </div>
          </div>
          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={submit} disabled={!name.trim()}>
              Add bottle
            </button>
          </div>
        </div>
      ) : (
        <div className="row-actions">
          <button className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>
            + Add a bottle
          </button>
        </div>
      )}

      {barBottles.length === 0 && (
        <div className="empty">Your bar’s empty. Add a few bottles to see what’s shakeable.</div>
      )}

      {groups.map(([category, list]) => (
        <section key={category}>
          <div className="section-label">
            {category} · {list.length}
          </div>
          {list.map((b) => {
            const fresh = barFreshness(b);
            return (
              <div key={b.id} className="inv-item">
                <div style={{ flex: 1 }}>
                  <div className="name">{b.display_name}</div>
                  <div className="detail">
                    {b.package_size ? `${b.package_size} · ` : ''}
                    {b.quantity_remaining} on hand
                  </div>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => consume(b, 1)}>
                      Use 1
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => discard(b, b.quantity_remaining)}>
                      Out
                    </button>
                  </div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`chip ${fresh.shelfStable ? 'fresh' : 'soon'}`} title={fresh.note}>
                    <span className="glyph" aria-hidden>
                      {fresh.shelfStable ? '●' : '▲'}
                    </span>
                    {fresh.label}
                  </span>
                  <LikeButton liked={!!b.liked} onToggle={() => toggleLike(b.id)} label={b.display_name} />
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

function Cocktails() {
  const { cocktails } = useMise();
  const shakeable = cocktails.filter((c) => c.canMake).length;
  return (
    <>
      <div className="callout">
        <b>{shakeable}</b> of {cocktails.length} shakeable with what’s on hand right now.
      </div>
      {cocktails.map((c) => (
        <CocktailCard key={c.id} c={c} />
      ))}
    </>
  );
}

export default function BarPage() {
  const [tab, setTab] = useState<'cocktails' | 'bottles'>('cocktails');
  return (
    <>
      <Header
        kicker="Mise · Bar"
        title="The bar"
        sub="What’s shakeable tonight, and what’s on the shelf."
      />
      <div className="screen">
        <Toolbar />
        <div className="seg" role="tablist" style={{ marginBottom: 12 }}>
          <button
            className={tab === 'cocktails' ? 'on' : ''}
            onClick={() => setTab('cocktails')}
            role="tab"
            aria-selected={tab === 'cocktails'}
          >
            Cocktails
          </button>
          <button
            className={tab === 'bottles' ? 'on' : ''}
            onClick={() => setTab('bottles')}
            role="tab"
            aria-selected={tab === 'bottles'}
          >
            Bottles
          </button>
        </div>

        {tab === 'cocktails' ? <Cocktails /> : <Bottles />}
      </div>
    </>
  );
}
