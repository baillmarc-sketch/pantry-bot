# Mise — Marc & Anna's Kitchen Brain 🍳

*Scan it in, see what's dying, get 3 good dinners. Stop wasting food.*

Built for a 2-person household. Aesthetic: **"Warm Market Stall"** — cream paper, ink
text, chili-crisp red, produce-green. See [`docs/MISE-BUILD-PLAN.md`](docs/MISE-BUILD-PLAN.md)
and [`BUILDER-PROFILE.md`](BUILDER-PROFILE.md) for the full intent.

## Status

| Phase | What | State |
|---|---|---|
| **0** | Framework-free core engine + data catalogs + tests | ✅ done |
| **0** | Next.js + "Warm Market Stall" + PWA shell, Home & Inventory | ✅ done · live on Vercel |
| **1** | Core loop on `MockAIProvider`: scan → confirm → inventory → cook, local-first persistence | ✅ done |
| **1** | Likes list + search + categories; save-your-own recipes on the Cook screen | ✅ done |
| **1** | Bar: bottle tracking + cocktail book with "shakeable now" | ✅ done |
| 2 | Real `AnthropicAIProvider` + fridge vision (propose-only) | planned |
| 2 | Supabase + RLS for two-phone sync (replaces localStorage) | planned |
| 3 | Learns your staples & weekly habits | planned |

**Live:** https://pantry-bot-pi.vercel.app — runs entirely on the mock + localStorage at **$0**.

## Architecture — pure engine, swappable seams

```
lib/
├─ core/          FRAMEWORK-FREE. No React, no fetch, no AI.
│  ├─ types.ts      shared shapes (the contract)
│  ├─ normalize.ts  the $0 cost layer: messy text → canonical name
│  ├─ inventory.ts  event-sourced → quantity is DERIVED, never clobbered
│  ├─ spoilage.ts   conservative status; never asserts "safe to eat"
│  ├─ taste.ts      Marc + Anna palate + the dairy predicate (not dairy-free)
│  └─ ranker.ts     recipe scoring: expiring-first → on-hand → fewest-new → palate
├─ data/          CATALOGS (JSON), grow without touching logic
│  ├─ shelf-life.json   conservative, FoodKeeper-aligned guidance
│  ├─ staples.json      house staples (assumed on hand)
│  └─ aliases.json      normalization dictionary ($0 path)
└─ ai/            the swappable seam — AI is an adapter, not the brain
   ├─ provider.ts   interface AIProvider
   └─ mock.ts       deterministic fixtures; build/test the whole loop at $0
```

**Two load-bearing principles**

- **Inventory is event-sourced.** `current_qty = Σ event.quantity_change`. Two phones
  appending concurrently reconcile by summation — merge, never clobber, rather double
  than lose. Order-independent (proven in tests).
- **Food-safety honesty.** Spoilage is *guidance*, never a guarantee. Unknown items and
  unknown storage resolve to **"Confirm status,"** not "fresh," and assume the **shorter**
  shelf life. The app never renders "safe to eat."

## Security

Local-first and backend-less by design, so the surface is small: no secrets in the repo or
bundle, no network calls, no `dangerouslySetInnerHTML`/`eval`, all user input rendered as escaped
React text, and every `localStorage` read `try/catch`-guarded. Production ships tight HTTP headers
(CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`) and `npm audit` is clean.
Full posture and the Firebase + Google-SSO hardening checklist: [`docs/SECURITY.md`](docs/SECURITY.md).

## Develop

```bash
npm install
npm run dev         # next dev (http://localhost:3000)
npm run typecheck   # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test            # vitest run

# headless verification (needs a running server on $BASE, default :3100)
node scripts/e2e.mjs            # drives scan -> confirm -> inventory -> cook
SHOOT=1 node scripts/shoot.mjs  # iPhone-viewport screenshots
```

## Deploy (Vercel)

Zero-config — Vercel auto-detects Next.js. No env vars needed yet (Supabase/AI
are parked). Two ways:

- **Git integration (recommended):** Vercel dashboard → New Project → import
  `baillmarc-sketch/pantry-bot` → Deploy. Every push then auto-deploys; pushes
  to the default branch are production, other branches get preview URLs.
- **CLI:** `vercel deploy --prod` from the repo root (needs `vercel login` or a
  `--token`).

No build config required: build `next build`, output `.next`, install `npm install`.

### Proof (last run)

```
Test Files  11 passed (11)
     Tests  55 passed (55)        # vitest: unit
25/25 PASS  ALL PASS              # scripts/e2e.mjs: headless loop
```
Unit covers: event-sourced derivation incl. two-phone reconciliation & no-negative/no-silent-loss;
spoilage transitions (fresh/soon/today/past/unknown) + conservative fallbacks + opened-clock;
the dairy predicate; palate scoring; recipe ranking order; the $0 normalization dictionary;
the mock AI seam (propose-only fridge parse); and the store action builders (ingest/merge,
consume, discard, cook). E2e drives scan → confirm (drop one) → inventory, asserts the merge
math, then confirms a mutation persists across reload (localStorage) and cooking deducts.
