# Mise — Handoff

_Last updated: 2026-09-15 · Branch `claude/profile-brief-readiness-0olpn3` · HEAD `d7fa84a`_

This is the "pick it up cold" doc. If you (or another agent) come back to Mise after a
gap, read this, then the [PRD](PRD.md) for what's next.

## TL;DR

Mise is a working, local-first kitchen app for a two-person household (Marc & Anna). It
runs entirely in the browser on seed data + `localStorage` at **$0** — no backend, no
accounts, no AI spend yet. Everything is committed and pushed. Tests are green
(**77 unit + 28 headless e2e**). The one thing it is NOT yet: deployed with the current
build, and synced across two real phones. Those are the launch steps (see PRD).

## Repo facts

- **Repo:** `baillmarc-sketch/pantry-bot` · **working branch:** `claude/profile-brief-readiness-0olpn3`
- **Live URL:** https://pantry-bot-pi.vercel.app — ⚠️ shows an **early build**. The current
  code is not deployed because the Vercel CLI token hit a **SAML SSO wall** on the
  `stint-baill-dev` team. Fix is a one-time dashboard action (see Constraints + PRD M1).
- **Stack:** Next.js 15 (App Router) · React 18 · TypeScript (strict) · vitest · Playwright
  for headless checks. No CSS framework — hand-rolled "Warm Market Stall" design tokens.

## What it does today

- **Pantry** — event-sourced inventory; spoilage as conservative *guidance* (never "safe to
  eat"); per-item **best-by override**; freeze tips; search; categories; ♥ likes.
- **Cook** — ranks "what's about to turn → cook this"; a dated **Use-it-up** list; a **time +
  effort planner** (≤30/≤60/Any · Easy/Involved).
- **Recipe book** — 8 recipes loaded from typed text, a photo, two web links, and a video,
  plus an **Add-a-recipe form** that captures full step-by-step method + effort.
- **Bar** — bottle tracking + a cocktail book with "shakeable now" (favorites + classics).
- **Health** — the **Balance** rating (Powerhouse / Balanced / Hearty / Treat) tuned to the
  house philosophy (rewards produce + clean protein; never shames butter/sugar/MSG; treats
  are treats). Per-serving **macros**, labeled `est.`
- **Taste profile** — Anna→Japanese, Marc→Thai/Chinese/Korean, shared French/Italian,
  explore-anything, Asian-leaning pantry + MSG. Feeds the ranker now and the AI later.
- **Security** — CSP/HSTS/security headers, 0 `npm audit` vulns, no secrets in repo.

## Architecture (the important part)

The design is swappable seams so the backend and AI drop in without rewrites:

```
lib/
├─ core/     FRAMEWORK-FREE pure engine (no React/fetch/AI):
│  inventory (event-sourced) · spoilage · freeze · ranker · taste · health ·
│  effort · search · snapshot · normalize · bar · types
├─ data/     JSON catalogs: shelf-life · staples · aliases
├─ ai/       the AI SEAM: provider.ts (interface) + mock.ts (deterministic, $0)
├─ store/    miseStore.ts (localStorage source of truth) · useMise.ts (React hook) ·
│            actions.ts + recipeForm.ts (pure) · fixtures/ (seed data)
app/         Next.js views: Cook (/) · Pantry (/inventory) · Scan · Likes · Bar · recipes/new
```

Two load-bearing decisions, both proven in tests:

1. **Inventory is event-sourced.** `current_qty = Σ event.quantity_change`. Two phones
   appending concurrently reconcile by summation — this is why cross-phone sync will "just
   work" with no clobbering.
2. **The AI is an adapter, not the brain.** Everything runs against `MockAIProvider`; the
   real Anthropic adapter implements the same `AIProvider` interface. The pure engine never
   imports AI.

## Run & verify

```bash
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test            # vitest — 77 passing
npm run build

# headless verification (needs a running prod server; start `npm run start` first)
node scripts/e2e.mjs           # drives scan→confirm→inventory→cook→likes→bar→add-recipe (28 checks)
SHOOT=1 node scripts/shoot.mjs # iPhone-viewport screenshots to /tmp
```

## Constraints & gotchas (read before resuming)

- **Data is per-device.** `localStorage` only. No sync, no accounts. This is the #1 thing
  launch changes. State never leaves the browser and clears if site data is cleared.
- **Seed data is demo.** The pantry, bar, and some recipes are seeded fixtures, clearly
  labeled — not the couple's real inventory. "Reset demo" restores them.
- **Deploy is SAML-blocked.** CLI deploys to the team fail auth. Use Vercel **git
  integration** (dashboard) or a SAML-authorized token. See PRD M1.
- **Macros are estimates**, flagged `est.` — not a tracker. The AI will refine them.
- **Ephemeral container.** `node_modules` has been wiped mid-session more than once; just
  `npm install` again. Nothing in the repo is affected.
- **Connectors available this session:** Supabase and Vercel MCP are connected — relevant to
  executing the backend + deploy steps (see PRD).

## Docs map

- [`PRD.md`](PRD.md) — the launch plan (read next)
- [`SECURITY.md`](SECURITY.md) — posture + Firebase/SSO hardening checklist
- [`PORT-FIREBASE.md`](PORT-FIREBASE.md) — the SyncProvider seam + Firebase wiring (also
  applies conceptually to Supabase: rules → RLS)
- [`MISE-BUILD-PLAN.md`](MISE-BUILD-PLAN.md), [`MISE-TECH-STACK.md`](MISE-TECH-STACK.md) —
  original intent + tech choices
- `../BUILDER-PROFILE.md` — how the studio builds

## How to resume

1. `npm install && npm test` (confirm green).
2. Read the PRD, pick the next milestone.
3. The human-only unblocks (Vercel access, backend project, Anthropic key) are listed in the
   PRD's "What we need from Marc & Anna" — none of them can be done from inside the sandbox.
