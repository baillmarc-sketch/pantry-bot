'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../ui';
import {
  getPendingScan,
  clearPendingScan,
  applyScan,
} from '../../../lib/store/miseStore';
import type { ConfirmedItem } from '../../../lib/store/actions';
import type { Location } from '../../../lib/core/types';

interface Row extends ConfirmedItem {
  _keep: boolean;
}

const LOCATIONS: Location[] = ['fridge', 'freezer', 'pantry', 'spice', 'counter'];

export default function ConfirmPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    setRows(getPendingScan().map((p) => ({ ...p, _keep: true })));
  }, []);

  function patch(i: number, change: Partial<Row>) {
    setRows((rs) => (rs ? rs.map((r, idx) => (idx === i ? { ...r, ...change } : r)) : rs));
  }

  const kept = rows?.filter((r) => r._keep) ?? [];

  function add() {
    const confirmed: ConfirmedItem[] = kept.map(({ _keep, ...rest }) => rest);
    applyScan(confirmed);
    clearPendingScan();
    router.push('/inventory');
  }

  return (
    <>
      <Header
        kicker="Mise · Confirm"
        title="Look right?"
        sub="Edit anything, drop what’s wrong. Only what you keep gets added."
      />
      <div className="screen">
        {rows && rows.length === 0 && (
          <div className="empty">
            Nothing to confirm. <Link href="/scan">Scan a receipt</Link>.
          </div>
        )}

        {rows?.map((r, i) => (
          <div key={i} className={`confirm-row ${r._keep ? '' : 'dropped'}`}>
            <div className="top">
              <input
                type="text"
                value={r.display_name}
                aria-label="Item name"
                onChange={(e) => patch(i, { display_name: e.target.value })}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => patch(i, { _keep: !r._keep })}
                aria-pressed={!r._keep}
              >
                {r._keep ? 'Drop' : 'Keep'}
              </button>
            </div>
            <div className="grid">
              <input
                type="number"
                min={1}
                value={r.quantity}
                aria-label="Quantity"
                onChange={(e) => patch(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              />
              <select
                value={r.location}
                aria-label="Location"
                onChange={(e) => patch(i, { location: e.target.value as Location })}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc[0]!.toUpperCase() + loc.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {(r.confidence ?? 1) < 0.9 && (
              <div className="lowconf">⚠️ Low confidence — double-check this one.</div>
            )}
          </div>
        ))}

        {kept.length > 0 && (
          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={add}>
              Add {kept.length} item{kept.length === 1 ? '' : 's'} to pantry
            </button>
          </div>
        )}
      </div>
    </>
  );
}
