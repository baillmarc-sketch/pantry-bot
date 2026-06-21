# Mise — Marc & Anna's Kitchen Brain 🍳

*Scan it in, see what's dying, get 3 good dinners. Stop wasting food.*

Built for a 2-person household. Aesthetic: **"Warm Market Stall"** — cream paper, ink
text, chili-crisp red, produce-green. See [`docs/MISE-BUILD-PLAN.md`](docs/MISE-BUILD-PLAN.md)
and [`BUILDER-PROFILE.md`](BUILDER-PROFILE.md) for the full intent.

## Status

| Phase | What | State |
|---|---|---|
| **0** | Framework-free core engine + data catalogs + tests | ✅ **this slice** |
| 0 | Next.js + Supabase + RLS shell, PWA, manual add/edit UI | next |
| 1 | Core loop on `MockAIProvider` (receipt → confirm → recipes → cooked) | planned |
| 2 | Real `AnthropicAIProvider` + fridge vision (propose-only) | planned |
| 3 | Learns your staples & weekly habits | planned |

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

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test            # vitest run
```

### Proof (last run)

```
Test Files  6 passed (6)
     Tests  29 passed (29)
```
Covers: event-sourced derivation incl. two-phone reconciliation & no-negative/no-silent-loss;
spoilage transitions (fresh/soon/today/past/unknown) + conservative fallbacks + opened-clock;
the dairy predicate; palate scoring; recipe ranking order; the $0 normalization dictionary;
and the mock AI seam (propose-only fridge parse).
