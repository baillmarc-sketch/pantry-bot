# Security — Mise

_Last reviewed: 2026-07-07. Scope: the whole app as it stands (local-first, no backend yet)._

## Current posture (what's locked down)

Mise today is a **local-first, backend-less** Next.js app. That keeps the attack surface small on purpose.

- **No backend, no secrets.** There is no server, no database, no API key anywhere in the
  repo or the client bundle. `git` history has been swept — no tokens or credentials were ever
  committed. `.env*`, `.vercel`, `*.pem`, `*.key` are git-ignored.
- **No dangerous sinks.** No `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`,
  or `innerHTML`. All user input (scan text, recipe/bottle names, search) renders as **escaped
  React text**, so stored/reflected XSS has no vector.
- **All persisted reads are guarded.** Every `JSON.parse` of `localStorage`/`sessionStorage`
  is wrapped in `try/catch` and falls back to a safe default, so corrupt/hostile local data
  can't crash or hijack the app.
- **No network calls.** The client makes no `fetch`/XHR/WebSocket calls to any origin, so there
  is nothing to exfiltrate to and no third-party script to trust.
- **HTTP security headers** (see `next.config.mjs`), verified served in production:
  - `Content-Security-Policy` — `default-src 'self'`, `connect-src 'self'` (blocks exfiltration
    to other origins), `frame-ancestors 'none'` + `X-Frame-Options: DENY` (clickjacking),
    `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, images limited to self/data/blob.
    `'unsafe-inline'` is required by Next's hydration; `'unsafe-eval'` is dev-only (HMR).
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy: camera=(self), microphone=(), geolocation=()`,
    `Strict-Transport-Security` (HSTS), and `poweredByHeader: false`.
- **Dependencies:** `npm audit` is clean (0 vulnerabilities). A `postcss` override pins it above
  advisory GHSA-qx2v-qp2m-jg93 without the destructive Next downgrade.

## Data handled

Low-sensitivity by design: pantry/bar inventory, recipes, and cocktail specs. The only PII is
**first names** (Marc, Anna). No emails, payments, health, or location data are stored.
`localStorage` is device-local and unencrypted — acceptable **because the data is non-sensitive**.
Rule going forward: **never** put auth tokens, secrets, or real PII in `localStorage`.

## Known port-time TODOs (safe today, must fix before multi-user/backend)

- **Predictable household id.** The demo uses `h-marc-anna`. Before any shared backend, mint an
  **unguessable id** (`crypto.randomUUID()`, ~122 bits) so household data can't be enumerated.
- **Non-crypto id fallback.** `defaultCtx.id()` falls back to `Date.now()+seq` when
  `crypto.randomUUID` is unavailable. Fine for local event ids; use crypto for anything that
  gates access (share links, invites, household ids).

---

## Hardening checklist for the Firebase + Google SSO port

When we move sync/auth to Firebase, security is delegated to **rules + App Check**, not a custom
server (matches the studio's "security via rules/RLS" rule).

### Auth (Google SSO)
- [ ] Firebase Auth with the **Google provider**. Deny-by-default everywhere else.
- [ ] **Restrict to the household, not "any Google account."** Only allow the two of you — either
      an allow-list of emails checked in security rules, or an invite/membership doc
      (`households/{hid}/members/{uid}`) that a user must already be in to read/write. A random
      Google sign-in must land on an empty, access-denied state.
- [ ] Consider **custom claims** (`householdId`) set by an admin-only function, so rules can check
      `request.auth.token.householdId == householdId` cheaply.

### Firestore / RTDB security rules (the real lock)
- [ ] **Default deny.** `allow read, write: if false;` at the root, then open only scoped paths.
- [ ] Every document carries `household_id`; a user may touch a doc **only if they're a member of
      that household**. This is the RLS-equivalent — never trust a client-supplied `household_id`
      without checking membership.
- [ ] **Validate shape on write**: event types/enums, numeric `quantity_change`, string lengths,
      no unexpected fields. The event log is append-only — reject edits/deletes of past events.
- [ ] Use **server timestamps** (`request.time`); don't trust client clocks for ordering.

### App Check & abuse
- [ ] Turn on **Firebase App Check** (reCAPTCHA v3 on web / Play Integrity) so only the real app
      can call Firestore/Storage/Functions.
- [ ] **Storage rules** for scan images: scoped to the household path, size/content-type limits,
      short-lived signed URLs. Extract data then **downscale or delete** the original — don't hoard.

### Secrets & env vars
- [ ] **The Firebase web config `apiKey` is NOT a secret** — it's a public project identifier.
      It's fine in the client; security comes from rules + App Check. Don't treat leaking it as an
      incident, and don't try to hide it.
- [ ] **Admin SDK / service-account JSON is server-only** — Vercel env var, never in the client
      bundle, never in the repo. Redact from all error output.
- [ ] **`ANTHROPIC_API_KEY`** (when AI lands) is read **only** inside `app/api/ai/*`, never
      `NEXT_PUBLIC_`, never logged. Set a **spend cap** before the first real call.
- [ ] Env rule: anything **without** the `NEXT_PUBLIC_` prefix must never reach the browser bundle.
      Redact secrets from every thrown error and every log line.

### Transport & platform
- [ ] HTTPS only (Vercel default) + HSTS (already set). Keep the CSP tight; if a strict
      nonce-based CSP is wanted later, add it via middleware and drop `'unsafe-inline'`.
- [ ] Rate-limit the `/api/ai` route (cost + abuse), on top of the Anthropic spend cap.

### Ongoing
- [ ] Keep `npm audit` clean; review the `postcss` override when Next ships a patched release.
- [ ] Re-run this checklist whenever a backend, a new provider, or file uploads are added.
