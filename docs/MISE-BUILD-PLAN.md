# Build Plan: **Mise** — Marc & Anna's Kitchen Brain

> Drop this into the repo alongside `BUILDER-PROFILE.md`. Read both before writing code.
> Working name: **Mise** (swap freely). Built for: Marc + Anna, 2-person Brooklyn/Hoboken household.
> One-line: *Scan it in, see what's dying, get 3 good dinners. Stop wasting food.*

---

## 0 · The one decision that shapes everything

This is **not** a static no-backend app, and that's correct per the profile's own rule ("justify any step up the ladder"). Three forces push us up:

1. **AI vision needs a secret key** → it must live server-side, never in the client.
2. **Two phones, one kitchen** → Marc and Anna both scan/cook → shared, merge-safe sync.
3. **Image uploads** → receipts/fridge photos need storage.

So: **Next.js (App Router) on Vercel + Supabase**. This is the Sup'Maine / Stint tier, not the Workback/Blackjack tier. Everything else below is built to keep this as *thin* as possible.

**Why Supabase over Firebase here:** the data is relational (items ↔ events ↔ recipes ↔ shopping list). Postgres + RLS fits it; Storage holds scan images; Realtime gives cross-phone sync. (Firebase RTDB was right for the Eggs leaderboard; it's the wrong shape here. If you'd rather stay on Firebase, it works — just heavier for relational queries.)

**Security delegated to RLS, not a custom server.** One household, two users, row-level scoped. No bespoke auth server.

---

## 1 · Aesthetic — named, with tokens at the top

**"Warm Market Stall."** Cream paper, ink text, one hot accent (chili-crisp red), produce-green for "fresh." Reads like a butcher's tag / market chalkboard, not a calorie app, not a spreadsheet. Glanceable while standing at the counter with one hand.

```css
:root {
  /* surfaces */
  --paper:      #FBF7F0;   /* warm cream background */
  --card:       #FFFFFF;
  --ink:        #1F1B16;   /* near-black warm */
  --ink-soft:   #6B6258;
  /* accents */
  --chili:      #D6492F;   /* primary action / "use today" */
  --olive:      #5E6B3B;   /* fresh / good */
  --amber:      #C98A2B;   /* use soon / warning */
  --line:       #EDE6DA;
  /* status (color-independent cues required too: ●/▲/■ + label) */
  --fresh: var(--olive);
  --soon:  var(--amber);
  --today: var(--chili);
  --gone:  var(--ink-soft);
  /* type + space */
  --font: ui-rounded, -apple-system, "SF Pro Rounded", system-ui, sans-serif;
  --r: 14px;            /* card radius */
  --tap: 48px;          /* min touch target */
}
```

**Non-negotiables (from the profile):**
- iPhone-first PWA: manifest, `apple-mobile-web-app-capable`, **safe-area insets**, all inputs **≥16px** (kills iOS focus-zoom), `pointerdown` for taps, big targets.
- Card-based, few buttons, no save buttons (autosave everywhere).
- Status is never color-only: pair every chip with a glyph + word (`● Fresh`, `▲ Use soon`, `■ Use today`).
- Defend the look — kill auto dark-mode if it fights the warm cream.

---

## 2 · Architecture — pure engine, swappable seams

The profile's loudest structural rule: **keep the domain engine pure and separate from the view, and make the AI a swappable adapter — not the brain.** Same instinct as Stint's `PaymentProvider` and `@stint/core`.

```
mise/
├─ lib/
│  ├─ core/                 # FRAMEWORK-FREE. No React, no fetch, no AI.
│  │  ├─ inventory.ts       # derive current state from event log
│  │  ├─ spoilage.ts        # status from shelf-life table + dates (conservative)
│  │  ├─ ranker.ts          # recipe usefulness scoring
│  │  └─ taste.ts           # Marc+Anna palate + dairy rules
│  ├─ data/
│  │  ├─ shelf-life.json    # CATALOG: item → shelf life by storage/state
│  │  └─ staples.json       # house staples seed list
│  ├─ ai/
│  │  ├─ provider.ts        # interface AIProvider { parseReceipt, parseFridge, suggestRecipes }
│  │  ├─ mock.ts            # MockAIProvider — deterministic fixtures (build/test against THIS)
│  │  └─ anthropic.ts       # AnthropicAIProvider — real calls, added in Phase 2
│  └─ db/                   # Supabase client + typed queries
├─ app/                     # Next.js App Router (the VIEW)
│  ├─ (screens)/…
│  └─ api/ai/…              # serverless routes — the ONLY place the key exists
└─ tests/                   # vitest unit + playwright e2e
```

**Two principles doing the heavy lifting:**

### a) Inventory is event-sourced → derived state, not hand-maintained
Current quantity is **computed** from the `InventoryEvent` stream, never stored as a mutable truth you race against. This is the profile's "derived state over hand-maintained state" *and* it's how we win the two-phone problem: concurrent edits become appended events that reconcile, instead of one phone clobbering the other.

- `current_qty(item) = Σ event.quantity_change` (added, consumed, discarded, restocked…)
- Stale client can't overwrite newer work — it can only append. **Merge, never clobber. Rather double than lose.**
- A nightly/derive pass can collapse the log, but the log is the source of truth.

### b) AI lives behind one interface
Build and ship the **entire loop against `MockAIProvider`** (canned receipt → fixed items, etc.). The real Anthropic adapter drops in behind the same interface with zero view changes — exactly the swappable-seam pattern. Lets you build, test, and demo with **$0 of API credit**, then flip one env flag to go live.

---

## 3 · The data, refined

Keeping your model, with the event-sourcing change made explicit and a few fields tightened.

**`InventoryItem`** — *identity + latest-known metadata only.* Quantity is derived.
`id, household_id, normalized_name, display_name, category, unit, location, brand, package_size, purchase_date, opened_date, source, confidence_score, notes, created_at, updated_at`
→ **no canonical `quantity` column.** `quantity_remaining` and `status` are computed on read.

**`InventoryEvent`** — *the source of truth.*
`id, item_id, household_id, event_type(added|consumed|edited|expired|discarded|moved|restocked), quantity_change, reason, source(receipt|fridge_scan|manual|recipe|meal_scan), actor(marc|anna), created_at`

**`Scan`** — `id, household_id, scan_type(receipt|fridge|pantry|freezer|spice|meal), image_path, raw_ai_output(jsonb), parsed_items(jsonb), confidence_score, status(pending|confirmed), created_at`

**`Recipe`** (generated, cached) — `id, title, servings, time_estimate, ingredients(jsonb), instructions(jsonb), inventory_items_used, missing_items, use_soon_items, effort_score, leftover_score, palate_match_score, finishing_move`
→ dropped `health_score` as a number (we're **not** a calorie app — "healthy & not boring" is a constraint on generation, not a metric we display).

**`MealLog`** — `id, recipe_id, household_id, date_cooked, servings_made, servings_leftover, ingredients_consumed(jsonb), notes` → writes `consumed` events + an optional `added` event for leftovers.

**`ShoppingListItem`** — `id, household_id, name, category, quantity, reason(low|recipe|staple|replacement), priority, linked_recipe_ids, checked, created_at`

**`Household` / `User`** — `household_id`, two users (Marc, Anna), `staples`, `taste_profile`. RLS scopes every row to `household_id`.

---

## 4 · Taste profile — Marc + Anna, encoded as rules (not guesses)

This is the personalization that makes it *ours*, not generic. Lives in `lib/core/taste.ts` as structured rules the ranker and recipe prompt both read.

**Palate lean (boost):**
- Asian: soy, miso, sesame, ginger, garlic, chili crisp, fish sauce, rice vinegar, dashi soy.
- Med / Middle Eastern: shawarma spice, tahini, lemon, herbs, cucumber salads, roasted veg.
- Default proteins: chicken thighs, salmon, cod, steak tips, eggs. Default carbs/veg: rice, sweet potato, zucchini, cucumber.
- **Always propose a finishing move** — a sauce/aioli/dressing. Simple food should land *finished*.

**Dairy rule (the important nuance — NOT dairy-free):**
- ✅ Aged cheese, goat cheese, sheep cheese — fine.
- ✅ Butter, esp. cultured/French-style — fine.
- ⚠️ **Avoid defaulting to heavy cream / milk-heavy** sauces and bases.
- 🚫 Buttermilk biscuits — known trigger, don't suggest.
- Implementation: a `dairy_ok()` predicate, not a blanket exclude. Flag milk-heavy recipes with a swap (e.g., "sub coconut milk / stock + a knob of butter").

**Vibe constraints:** for 2 + leftovers; weeknight-easy unless asked; weekly staples = egg bites, chia pudding. **Not** bland diet food, **not** a calorie tracker, **not** chef-y for its own sake.

---

## 5 · The risky parts (where this build actually lives or dies)

Per your "where's the risk" instinct — call them out up front and design for them.

### Risk 1 · Food safety honesty *(hard rule)*
Being confidently wrong here = someone eats bad salmon. So:
- Spoilage is **guidance, never a safety guarantee.** Statuses: `Fresh / Use soon / Use today / Past estimate — check it`.
- Never render "safe to eat." Anything uncertain → "Confirm status," defer to human judgment.
- Conservative dates: when storage/opened state is unknown, assume the **shorter** shelf life.
- This is the profile's "never invent / mark gaps / don't be dangerously confident," applied to a domain where it's literal health.

### Risk 2 · Two-phone data races
Solved by event-sourcing (§2a) + monotonic guards. Append-only. Realtime push so Anna sees Marc's scan land. **No silent loss path** is a Definition-of-Done item, not a nice-to-have.

### Risk 3 · AI over-deletion from one photo *(brief already flags this)*
A fridge photo never deletes inventory. It can only propose: `still present / looks low / can't see it → needs confirmation`. Removal requires a human tap. Clobber-aversion applied to vision.

### Risk 4 · AI cost
Layer cheap → expensive, default to the cheaper capable model:
- **$0 path first:** local normalization dictionary (`ORG CUKES → organic cucumber`) + canned `shelf-life.json` table. Most receipt lines never need a model.
- **Cheap model** (Haiku tier) for receipt text normalization that escapes the dictionary.
- **Mid model** (Sonnet tier) only for image vision + recipe generation (the genuinely hard reasoning).
- Cache aggressively; never re-scan an unchanged image; reuse generated recipes.

---

## 6 · MVP — sequenced by value × risk (a producer's cut)

Re-ordered from the brief: **receipt + manual first, fridge-vision second.** Receipt scan is higher-accuracy and higher-value than fridge vision, and fridge vision is the single most error-prone feature. Ship the loop, prove it, then add the hard camera magic.

**Phase 0 — skeleton (no AI):**
- Next.js + Supabase + RLS, Warm Market Stall tokens, PWA shell, manifest, safe-area layout.
- Manual add/edit item. Event-sourced inventory engine. `shelf-life.json` + spoilage status.
- **DoD:** add 3 items by hand → dashboard shows correct status; from a clean checkout; tests pasted.

**Phase 1 — the core loop (MockAIProvider):**
- Receipt upload → mock parse → **confirm screen** (item/qty/location/expiry · keep/edit/delete) → events written.
- Dashboard: *Use today / Use this week / Running low / Recently added.*
- Recipe suggestions: **3–5**, ranked (expiring-first → most-on-hand → fewest-new → palate → leftovers).
- Mark cooked → deduct via events; add leftovers back.
- **DoD:** headless Playwright run of receipt → confirm → inventory updates → recipes → cooked → deducted. Pasted with counts.

**Phase 2 — real AI (AnthropicAIProvider) + fridge vision:**
- Flip the provider flag. Wire serverless routes. Receipt OCR + fridge-photo vision (propose-only, never delete).
- In-app assistant, grounded strictly in actual inventory.
- **DoD:** real receipt scans correctly end-to-end; cost-layering verified (dictionary handles the easy lines, model only the rest).

**Phase 3 — learns you:**
- Auto-suggest staples from repeat buys; weekly-habit awareness (egg bites, chia pudding); smarter shopping list "why."

---

## 7 · Screens

Home (Cook This First) · Scan/Upload · Inventory · Recipes · Shopping List · Staples · Settings/Taste. Home leads with **"What should I cook next?" → 3–5 cards**, not 30. Each recipe card: title · *why it's recommended* · uses-from-inventory · still-needed · saves-from-going-bad · time · servings · leftover note · **finishing move**.

---

## 8 · Definition of Done *(the profile's loudest signal — proof, not vibes)*

Every PR body ends with what you ran and what you saw. Ship in small, verifiable PRs.
- [ ] Core engine unit-tested with **counts** (deduction math, spoilage transitions, ranker ordering, `dairy_ok`).
- [ ] Playwright e2e of the full loop, **headless, pasted result**.
- [ ] No silent data-loss path; concurrent two-actor edits reconcile (test it).
- [ ] No invented data; unsourced fields `null`; spoilage never asserts safety.
- [ ] Secrets server-side only, redacted from all error output.
- [ ] a11y: `:focus-visible`, `aria-live` on status changes, `prefers-reduced-motion`, non-color status cues.
- [ ] Runs as installed PWA on an actual iPhone; safe areas + 16px inputs verified.
- [ ] Self "senior review pass" on your own diff — fix the real findings, note false positives.

---

## Appendix · Wiring the Anthropic API (Phase 2 — after the loop works)

Build everything against `MockAIProvider` first. When ready, implement `AnthropicAIProvider` behind the same `AIProvider` interface. Key facts:

- **Key lives only in a Vercel serverless route** (`app/api/ai/*`), read from an env var (`ANTHROPIC_API_KEY` in Vercel project settings). Never in client code, never in the bundle. Redact it from any thrown error.
- **Endpoint:** the Messages API (`POST https://api.anthropic.com/v1/messages`). Vision works by passing the image as a base64 `image` content block alongside a `text` instruction — perfect for receipts and fridge photos.
- **Model tiers (cost layering):**
  - Haiku tier — receipt text normalization that misses the local dictionary.
  - Sonnet tier — image/vision parsing + recipe generation (the real reasoning).
  - Don't reach for Opus on routine calls.
- **Structured output:** prompt for **JSON only** (no prose, no markdown fences), then parse defensively (strip stray fences, `try/catch`, fall back to "needs confirmation" on parse failure). Validate against your `parsed_items` schema before writing events.
- **Grounding:** the assistant and recipe generator must receive current derived inventory in the prompt and be instructed to use only what's on hand (flag missing items, never invent pantry stock).
- Pull exact request/response shapes from the official docs when you wire it: **https://docs.claude.com/en/api/overview** (Messages API + vision). Verify current model strings there rather than trusting any hardcoded guess.

---
*Sequence: name it → Phase 0 skeleton → Phase 1 loop on the mock → Phase 2 real AI. Build small, prove each phase, paste the result.*
