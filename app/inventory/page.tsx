'use client';

import Link from 'next/link';
import { Header, StatusChip } from '../ui';
import { Toolbar } from '../controls';
import { useMise } from '../../lib/store/useMise';

const LOCATION_LABEL: Record<string, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  pantry: 'Pantry',
  spice: 'Spice',
  counter: 'Counter',
  unknown: 'Unsorted',
};

export default function InventoryPage() {
  const { snapshot, consume, discard } = useMise();

  return (
    <>
      <Header
        kicker="Mise · Pantry"
        title="What's in the kitchen"
        sub={`${snapshot.length} item${snapshot.length === 1 ? '' : 's'} on hand · most urgent first`}
      />
      <div className="screen">
        <Toolbar />

        {snapshot.length === 0 && (
          <div className="empty">
            Nothing on hand. <Link href="/scan">Scan a receipt</Link> to stock up.
          </div>
        )}

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
              <div style={{ flex: 1 }}>
                <div className="name">{item.display_name}</div>
                <div className="detail">
                  {item.quantity_remaining} {item.unit}
                  {item.quantity_remaining === 1 ? '' : 's'} ·{' '}
                  {LOCATION_LABEL[item.location] ?? item.location}
                  {item.opened_date ? ' · opened' : ''}
                </div>
                <div className="row-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => consume(item, 1)}
                    aria-label={`Use one ${item.display_name}`}
                  >
                    Use 1
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => discard(item, item.quantity_remaining)}
                    aria-label={`Toss ${item.display_name}`}
                  >
                    Toss
                  </button>
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
          Spoilage dates are <b>guidance, not a guarantee</b>. When in doubt, trust your eyes and
          nose — Mise never says “safe to eat.”
        </div>
      </div>
    </>
  );
}
