# PRD — Mise, launch for Marc & Anna

_Owner: baillmarc@gmail.com · Status: draft for review · 2026-09-15_
_Current state: see [HANDOFF.md](HANDOFF.md). This doc is only about getting from "works on
one device" to "the two of us use it for real."_

## 1. Summary

Mise is a kitchen brain for our two-person household: track what we have, see what's dying,
get good dinners, run the bar, keep our recipe book. The app is built and works locally.
"Launch" means **the two of us, signed in on our own phones, sharing one live kitchen** —
real data, synced, used daily, not demo seed data on one browser.

## 2. Who it's for

Just us to start — Marc & Anna, one household. Not a public product. That keeps every
decision simple: two known users, one shared dataset, free tiers, no marketing, no support
load. (If friends want it later, that's a separate, post-launch conversation.)

## 3. What "launched" means (success criteria)

Launch is done when **all** of these are true:

1. The current build is live at a stable URL (ideally our own domain), installable to both
   our home screens as a PWA.
2. We each sign in with **Google**, and only our two accounts can get in.
3. We share **one** pantry / bar / recipe book. A change one of us makes shows up for the
   other within seconds — no clobbering, no lost notes.
4. It holds **our real data**, not the demo seed.
5. We can add to inventory by **scanning a receipt or a fridge photo** (nice-to-have for the
   very first launch; required for "the app we actually wanted").
6. We've used it to plan and cook for **one real week** without it getting in the way.

## 4. Non-goals (explicitly out of scope for launch)

- Public sign-up, other households, sharing, or any multi-tenant polish beyond "us two."
- A calorie tracker. Macros stay informational estimates; the Balance rating stays a nudge,
  not a diet. (Profiles/tracking remain a someday hook, per `lib/core/profile.ts`.)
- Native app-store apps. The installable PWA is enough.
- Perfect nutrition data. Estimates, labeled as such, are fine.

## 5. Milestones

M0 is done. M1–M4 are the launch path. Each is small and independently shippable.

### M0 — Local-first app _(DONE)_
The whole experience running at $0 on `localStorage` + mock AI. 77 unit + 28 e2e green.
This is the foundation everything below plugs into.

### M1 — Ship it live
**Goal:** the current build, on a real URL, on both our phones.

- Deploy the current branch to production (fixing the SAML block — see §7).
- Confirm PWA install works on both our iPhones (manifest, safe-area, add-to-home-screen).
- (Optional) Buy a domain (~$11/yr) and point it at the host.

**Acceptance:** we both open the same live URL on our phones, install it, and it looks and
works like the local build. **Still single-device data at this point — that's M2.**

**Depends on:** Vercel access unblocked (§7). **Cost:** $0 (+$11/yr optional domain).

### M2 — Accounts + shared sync _(the heart of "for me and my gf")_
**Goal:** two logins, one shared, live kitchen.

- Stand up the backend (Supabase **or** Firebase — decision in §6).
- **Google SSO**, restricted to our two emails. A stranger's Google login gets nothing.
- Move the store from `localStorage` to the backend behind a `SyncProvider` seam (already
  designed in [PORT-FIREBASE.md](PORT-FIREBASE.md); the local adapter ships first, unchanged,
  then the cloud adapter drops in).
- Real-time: one person's edit appears for the other. The event-sourced model already makes
  this merge-safe.
- Security rules / RLS: deny-by-default, scoped to our household, event log append-only
  (rules already drafted in `firestore.rules`; translate to Postgres RLS if we pick Supabase).
- Migrate our on-device data into the shared household on first sign-in.

**Acceptance:** Anna adds salmon on her phone; within seconds Marc sees it on his. Both
offline-edit, reconnect, nothing is lost. Only our two Google accounts can sign in.

**Depends on:** backend decision + project (§6, §7). **Cost:** $0 (free tiers).

### M3 — AI: scan and generate _(the app we actually wanted)_
**Goal:** stop typing inventory; start inventing dinners.

- Implement `AnthropicAIProvider` behind the existing `AIProvider` interface (no view
  changes). Key lives **only** in a server route (`app/api/ai/*`), never in the client.
- **Receipt photo → items** (through the existing Confirm screen). Dictionary handles the
  easy lines free; model only for the rest.
- **Fridge photo → propose-only** updates ("still here / looks low / can't see"), never
  auto-deletes.
- **Generate a dish** to the current pantry + the taste profile + the Balance goals + the
  time/effort dials (all already wired). Output includes an estimated-macro block and gets a
  Balance rating for free from our engine. Cache generated recipes so the book grows.
- Cost controls: local dictionary → cheap model for text → mid model for vision/generation;
  prompt caching for the taste profile; a hard spend cap.

**Acceptance:** photograph a real grocery receipt → confirmed items land in inventory with
correct-ish quantities; ask for "a 30-minute easy dinner from what we have" → an on-palate,
balanced dish appears with macros, and the Anthropic dashboard shows **cents, not dollars.**

**Depends on:** Anthropic key + spend cap (§7). **Cost:** ~$1–3/mo for two people.

### M4 — Daily-use polish
**Goal:** it earns a permanent spot on the home screen.

- **Shopping list** that pulls from Likes + what's running low + a recipe's "still need."
- A gentle **daily nudge** (PWA notification or email): today's use-it-up + a suggestion.
- Learn repeat buys → auto-suggest staples; weekly-habit awareness (egg bites, chia pudding).

**Acceptance:** a full real week of use where the app tells us what to cook, what to buy, and
what's about to go off — and we mostly listen to it.

## 6. Key decision: which backend

Both give us Postgres/Firestore + Google SSO + real-time on a free tier. Pick one:

| | **Supabase** _(recommended)_ | **Firebase** |
|---|---|---|
| Fit | Postgres + **RLS** — matches our relational data (items↔events↔recipes) and the original tech brief | Firestore + rules — great real-time, less natural for relational queries |
| Auth | Supabase Auth (Google) | Firebase Auth (Google) |
| Head start | A **Supabase connector is live in this session** — project + schema can be executed largely from here | `firestore.rules` already drafted; `PORT-FIREBASE.md` written |
| Our brief | `MISE-TECH-STACK.md` chose Supabase | We later wrote the Firebase port groundwork |

**Recommendation: Supabase.** It matches the data shape, it's what the tech brief picked, and
the connector being available now means less manual clicking. The Firebase groundwork isn't
wasted — the rules → RLS translation is direct, and the `SyncProvider` seam is backend-agnostic.

## 7. What we need from Marc & Anna (human-only unblocks)

None of these can be done from inside the build sandbox — they need your accounts:

- [ ] **Unblock Vercel deploy (M1).** Either connect the `pantry-bot` repo in the Vercel
      dashboard (New Project → import → deploy; then every push auto-deploys and the SAML
      problem disappears), **or** create a SAML-authorized Vercel token and hand it over.
- [ ] **Pick the backend (M2):** Supabase (recommended) or Firebase.
- [ ] **Create the backend project** (or approve me doing it via the Supabase connector,
      including the one-time cost confirmation if any). Provide the project URL + anon key.
- [ ] **Confirm the allowlist:** the exact two Google emails allowed to sign in.
- [ ] **Anthropic API key + spend cap (M3)**, set on your account. Load a little prepaid
      credit; set the cap *before* the first real call.
- [ ] **(Optional) Domain.** Want a real one (~$11/yr, Cloudflare at-cost)? If so, which name?

## 8. Costs (all-in, for two people)

- Build & run through M2: **$0** (Vercel Hobby + Supabase/Firebase free tiers).
- M3 AI: **~$1–3/month**.
- Optional domain: **~$11/year**.
- Note: Vercel **Hobby is personal/non-commercial** — fine for us; if Mise ever makes money,
  it's Pro ($20/mo) or a move to Cloudflare Pages.

## 9. Risks & mitigations

- **Free-tier limits / idle pause.** Supabase pauses after ~7 days idle → add the keep-alive
  cron from the tech brief. Watch the 500MB DB / 1GB storage ceilings (tiny for us).
- **AI cost creep.** Spend cap + cost-layering + prompt caching + never re-scanning an
  unchanged image.
- **Scan images pile up.** Extract data, then downscale or delete the original.
- **Food-safety over-confidence.** Already handled: spoilage is guidance, never "safe," and
  fridge scans propose, never delete. Keep it that way.
- **Lock-in / trust.** Local-first still works offline; the cloud is the shared layer, not the
  only copy.

## 10. Suggested order

**M1 → M2 → M3 → M4.** Live first (fast, satisfying), then the shared sync that makes it "ours,"
then the AI that makes it magic, then the polish that makes it stick. M3 can start in parallel
with M2 since it only touches the AI seam.

## 11. Open questions

- Supabase or Firebase? (recommendation: Supabase)
- Own domain at launch, or ship on the `*.vercel.app` URL first?
- Is receipt/fridge scanning required for *first* launch, or a fast-follow after M2?
- Any second-person favorites/bottles/recipes to seed before we go live with real data?
