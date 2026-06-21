# Mise — Tech Stack & Hosting Brief

> Add to the current build. Ship it in the order below — each phase is small and gets you something live before the next. AI is **last** so you're not paying while you build.

---

## Stack at a glance — 5 tools

| Tool | Job | Cost |
|---|---|---|
| **GitHub** | Repo, CI, keep-alive cron | Free |
| **Vercel** (Hobby) | Hosts Next.js app + the `/api/ai` route | Free* |
| **Supabase** (Free) | Postgres + auth + image storage + realtime sync (you + Anna) | Free |
| **Anthropic API** | Receipts, fridge vision, recipes | Pay-as-you-go (~$1–3/mo for 2) |
| **Cloudflare Registrar** | Custom domain at wholesale | ~$11/yr (.com) |

\*Vercel Hobby is **personal/non-commercial only**. Fine for you + Anna. The day Mise earns money → Pro, $20/mo.

**Run cost:** $0 to build · ~$1–3/mo once AI is live · ~$11/yr domain.

---

## Env vars (set in Vercel project settings)

```
NEXT_PUBLIC_SUPABASE_URL          # client-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY     # client-safe (RLS protects rows)
SUPABASE_SERVICE_ROLE_KEY         # SERVER ONLY — never in client
ANTHROPIC_API_KEY                 # SERVER ONLY — only read inside /api/ai
```

Rule: anything without `NEXT_PUBLIC_` never touches the browser bundle. Redact keys from all error output.

---

## Build order — little by little

### Phase A · Get it live on the domain (no DB, no AI)
- [ ] Next.js (App Router) app → push to GitHub → connect Vercel → live URL.
- [ ] Drop in the "Warm Market Stall" tokens + PWA shell (manifest, safe-area insets, 16px inputs).
- [ ] Buy domain at **Cloudflare Registrar** (at-cost, no markup). Point it at Vercel.
- **Done when:** the cream "Mise" shell loads at your domain, on your phone, installable to home screen.

### Phase B · Database + the two of you
- [ ] Create Supabase project. Build the schema (event-sourced inventory — current qty derived from `InventoryEvent`).
- [ ] One `household`, two users (Marc, Anna). **RLS scoped to `household_id`** on every table.
- [ ] Wire Supabase client with the env vars above.
- [ ] Add the **keep-alive cron** (see guardrails) so the project never pauses.
- **Done when:** you and Anna log in on separate phones, manually add an item, and both see it appear (realtime).

### Phase C · Image storage for scans
- [ ] Supabase **Storage** bucket, signed uploads, CDN-served (CDN assets don't count against egress).
- [ ] Extract data from a scan → downscale or discard the original. Don't hoard images.
- **Done when:** upload a fridge photo, it lands, the URL works, storage stays tiny.

### Phase D · AI (the only paid piece — do it last)
- [ ] Anthropic account → load **prepaid credit** + set a **spend cap** so it can't run away.
- [ ] Put `ANTHROPIC_API_KEY` in Vercel; read it **only** inside `app/api/ai/*`.
- [ ] Swap `MockAIProvider` → `AnthropicAIProvider` behind the same interface (no view changes).
- [ ] Cost layering: **local dictionary → Haiku 4.5 ($1/$5) for receipt text → Sonnet 4.6 ($3/$15) for vision + recipes.**
- [ ] Turn on **prompt caching** for the taste-profile/system prompt (≈90% off repeated input).
- **Done when:** a real receipt scans end-to-end and the Anthropic dashboard shows cents, not dollars.

---

## Guardrails (the gotchas, pre-solved)

- **Supabase pauses after 7 days idle.** Add a GitHub Actions cron that pings the DB every 3 days. Free, silent, never pauses.
- **Vercel function timeouts** can bite slow AI calls. Keep prompts tight, use Haiku for extraction, don't stream long. Receipt/recipe payloads are small → you'll stay under. If vision stalls, that's the signal to go Pro.
- **Vercel Hobby = non-commercial.** Personal use only. Monetize → Pro ($20/mo).
- **Spend cap on Anthropic** is non-negotiable — set it before the first real call.
- **Storage discipline** — extract then drop/downscale scan images to stay inside Supabase's 1GB free.

Free-tier ceilings to watch: Supabase **500MB DB / 1GB storage / 5GB egress per month**. Tiny for a 2-person kitchen, but check the usage tab if anything feels off.

---

## Escape hatch (don't build it now)

If Mise ever earns money or goes bandwidth-heavy: swap **Vercel → Cloudflare Pages** (unlimited free bandwidth, no non-commercial rule). More setup friction, so skip for v1 — but buying the domain at Cloudflare now makes that move painless later.

---
*Order holds the line on budget-first: live on day one, real sync next, pay for AI last.*
