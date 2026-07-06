'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Cook', ico: '🍳', live: true },
  { href: '/inventory', label: 'Pantry', ico: '🧺', live: true },
  { href: '/scan', label: 'Scan', ico: '📷', live: true },
  { href: '/likes', label: 'Likes', ico: '❤️', live: true },
  { href: '/bar', label: 'Bar', ico: '🍸', live: true },
];

export function NavBar() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Primary">
      {ITEMS.map((it) => {
        const active =
          path === it.href || (it.href !== '/' && path.startsWith(`${it.href}/`));
        const cls = ['', active ? 'active' : '', it.live ? '' : 'soon']
          .filter(Boolean)
          .join(' ');
        const content = (
          <>
            <span className="ico" aria-hidden>
              {it.ico}
            </span>
            <span>{it.label}</span>
          </>
        );
        return it.live ? (
          <Link
            key={it.href}
            href={it.href}
            className={cls}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </Link>
        ) : (
          <a key={it.href} className={cls} aria-disabled title="Coming soon">
            {content}
          </a>
        );
      })}
    </nav>
  );
}
