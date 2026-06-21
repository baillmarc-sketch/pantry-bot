import { Header, StatusChip } from './ui';
import { SEED_ITEMS, SEED_EVENTS } from '../lib/fixtures/seed';
import { pantrySnapshot, toPantryEntries } from '../lib/core/snapshot';
import { rankRecipes } from '../lib/core/ranker';
import { MockAIProvider } from '../lib/ai/mock';

export const dynamic = 'force-dynamic'; // recompute statuses against "now"

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function whyLine(useSoonDisplay: string[], usedCount: number): string {
  if (useSoonDisplay.length === 1) return `Uses your ${useSoonDisplay[0]} before it turns`;
  if (useSoonDisplay.length > 1)
    return `Uses ${useSoonDisplay.slice(0, 2).join(' & ')} before they turn`;
  return `Uses ${usedCount} things you already have`;
}

export default async function HomePage() {
  const today = todayIso();
  const snapshot = pantrySnapshot(SEED_ITEMS, SEED_EVENTS, today);
  const nameToDisplay = new Map(snapshot.map((s) => [s.normalized_name, s.display_name]));
  const nameToStatus = new Map(snapshot.map((s) => [s.normalized_name, s.spoilage.status]));

  const ai = new MockAIProvider();
  const recipes = await ai.suggestRecipes({
    pantry: snapshot.map((s) => ({
      normalized_name: s.normalized_name,
      display_name: s.display_name,
      status: s.spoilage.status,
    })),
  });
  const ranked = rankRecipes(recipes, toPantryEntries(snapshot), { limit: 5 });

  const urgent = snapshot.filter((s) =>
    ['past', 'today', 'soon'].includes(s.spoilage.status),
  );

  const disp = (n: string) => nameToDisplay.get(n) ?? n;

  return (
    <>
      <Header
        kicker="Mise · Cook this first"
        title="What should we cook?"
        sub="Dinners that use what's about to turn — for Marc & Anna."
      />
      <div className="screen">
        {urgent.length > 0 && (
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
        )}

        {ranked.map((r) => {
          const useSoonDisplay = r.use_soon_items.map(disp);
          const otherUsed = r.inventory_items_used.filter(
            (n) => !r.use_soon_items.includes(n),
          );
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
                <div className="needs">
                  Still need: {r.missing_items.map(disp).join(', ')}
                </div>
              )}

              <div className="finish">
                Finishing move: <b>{r.finishing_move}</b>
              </div>

              {r.dairy_warnings.length > 0 && (
                <div className="dairy">
                  ⚠️ {r.dairy_warnings[0]} {r.dairy_swaps[0] ?? ''}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
