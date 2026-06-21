import { Header, StatusChip } from '../ui';
import { SEED_ITEMS, SEED_EVENTS } from '../../lib/fixtures/seed';
import { pantrySnapshot } from '../../lib/core/snapshot';

export const dynamic = 'force-dynamic';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const LOCATION_LABEL: Record<string, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  pantry: 'Pantry',
  spice: 'Spice',
  counter: 'Counter',
  unknown: 'Unsorted',
};

export default function InventoryPage() {
  const snapshot = pantrySnapshot(SEED_ITEMS, SEED_EVENTS, todayIso());

  return (
    <>
      <Header
        kicker="Mise · Pantry"
        title="What's in the kitchen"
        sub={`${snapshot.length} items on hand · most urgent first`}
      />
      <div className="screen">
        {snapshot.map((item) => {
          const d = item.spoilage.days_left;
          const daysText =
            d === null
              ? 'no date'
              : d < 0
                ? `${Math.abs(d)}d past estimate`
                : d === 0
                  ? 'best by today'
                  : `${d}d left`;
          return (
            <div key={item.id} className="inv-item">
              <div>
                <div className="name">{item.display_name}</div>
                <div className="detail">
                  {item.quantity_remaining} {item.unit}
                  {item.quantity_remaining === 1 ? '' : 's'} ·{' '}
                  {LOCATION_LABEL[item.location] ?? item.location}
                  {item.opened_date ? ' · opened' : ''}
                </div>
              </div>
              <div className="right">
                <StatusChip status={item.spoilage.status} />
                <div className="days">{daysText}</div>
              </div>
            </div>
          );
        })}

        <div className="callout">
          Spoilage dates are <b>guidance, not a guarantee</b>. When in doubt, trust your
          eyes and nose — Mise never says “safe to eat.”
        </div>
      </div>
    </>
  );
}
