'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Header, StatusChip, LikeButton } from '../ui';
import { Toolbar } from '../controls';
import { useMise } from '../../lib/store/useMise';
import { searchItems, groupByCategory } from '../../lib/core/search';

export default function LikesPage() {
  const { likes, toggleLike } = useMise();
  const [q, setQ] = useState('');

  const groups = useMemo(() => groupByCategory(searchItems(likes, q)), [likes, q]);
  const total = likes.length;

  return (
    <>
      <Header
        kicker="Mise · Things we like"
        title="Things we like"
        sub={`${total} saved · search or browse by category`}
      />
      <div className="screen">
        <Toolbar />

        <input
          type="text"
          inputMode="search"
          placeholder="Search likes — “dill”, “tinned”, “clams”…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search things we like"
        />

        {total === 0 && (
          <div className="empty">
            Nothing saved yet. Tap the ♡ on any item in your{' '}
            <Link href="/inventory">pantry</Link> to add it here.
          </div>
        )}

        {total > 0 && groups.length === 0 && (
          <div className="empty">No likes match “{q}”.</div>
        )}

        {groups.map(([category, items]) => (
          <section key={category}>
            <div className="section-label">
              {category} · {items.length}
            </div>
            {items.map((item) => (
              <div key={item.id} className="inv-item">
                <div style={{ flex: 1 }}>
                  <div className="name">{item.display_name}</div>
                  <div className="detail">
                    {item.brand ? `${item.brand} · ` : ''}
                    {item.package_size ?? `${item.unit}`}
                  </div>
                  <div className="detail">
                    {item.is_present ? (
                      <>
                        In {item.location} · {item.quantity_remaining} on hand
                      </>
                    ) : (
                      <span style={{ opacity: 0.7 }}>Not on hand</span>
                    )}
                  </div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.is_present && <StatusChip status={item.spoilage.status} />}
                  <LikeButton
                    liked={!!item.liked}
                    onToggle={() => toggleLike(item.id)}
                    label={item.display_name}
                  />
                </div>
              </div>
            ))}
          </section>
        ))}

        <div className="callout">
          Your likes stick around even when you’re out — handy for the shopping list later.
        </div>
      </div>
    </>
  );
}
