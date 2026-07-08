# Port guide: Firebase + Google SSO + cross-phone sync

This is the wiring plan to take Mise from **local-first (localStorage)** to
**synced across Marc's & Anna's phones**, with Google sign-in restricted to the
two of you. It builds on the existing seams — nothing here is a rewrite.

> **Why it isn't wired yet:** the live Firebase SDK needs a real project to test
> against, and "done" means verified. These artifacts (`firestore.rules`,
> `.env.example`, this guide) are ready to apply; the code lands when the project
> exists so every step can be proven. See `docs/SECURITY.md` for the full checklist.

## The one architectural change: a persistence seam

Today the store persists through a handful of functions in `lib/store/miseStore.ts`
(`persist` / `loadFromStorage` / the `storage` event). Introduce **one interface**
so the backend is swappable — exactly like `AIProvider`:

```ts
export interface SyncProvider {
  load(householdId: string): Promise<{ items; events; savedRecipes }>;
  append(householdId: string, events: InventoryEvent[]): Promise<void>;
  putItems(householdId: string, items: InventoryItem[]): Promise<void>;
  putRecipes(householdId: string, recipes: RecipeInput[]): Promise<void>;
  subscribe(householdId: string, onChange: () => void): () => void; // realtime
}
```

- `LocalSyncProvider` — wraps the current localStorage behavior (ship first; zero
  behavior change, keeps the app working offline).
- `FirebaseSyncProvider` — Firestore reads/writes + `onSnapshot` realtime. Drops in
  behind the same interface. The event log stays **append-only** (matches the rules).

Because inventory is **event-sourced**, cross-phone merge is already solved: both
phones append events; realtime delivers them; `deriveInventory` reconciles by
summation. No clobbering. Offline writes queue and flush on reconnect.

## Steps

### 1. Create the project
- Firebase console → new project. Enable **Firestore** (production mode) and
  **Authentication → Google** provider.
- Add the web app; copy the config into `.env.local` (and Vercel) using the
  `NEXT_PUBLIC_FIREBASE_*` keys in `.env.example`.

### 2. Lock down auth to the household (the important part)
Google SSO by itself must grant **nothing**. Two layers:
- **Blocking function** (`beforeUserCreated` / `beforeSignedIn`): reject any email
  not in `HOUSEHOLD_ALLOWED_EMAILS`. A stranger's Google login fails at the door.
- **Membership doc**: on first allowed sign-in, a server function creates
  `households/{hid}/members/{uid}`. All data access keys off membership (see rules).
- Optional: set a `householdId` **custom claim** so rules can check the token
  directly.

### 3. Deploy the security rules
- `firebase deploy --only firestore:rules` (rules live in `firestore.rules`).
- They are **deny-by-default**, scoped to household membership, and make the
  **event log append-only** (no client edit/delete of past events).

### 4. Turn on App Check
- Register **reCAPTCHA v3**; put the site key in `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
- Enforce App Check on Firestore so only the real app can call it.

### 5. Swap the provider
- Feature-flag: `LocalSyncProvider` by default, `FirebaseSyncProvider` when signed in.
- Add an **auth-gated shell**: signed-out → Google sign-in screen; signed-in →
  the app, scoped to the user's household.
- **Migrate** the current on-device demo/real data into the household on first
  sign-in (append the existing events).

### 6. Unguessable household id
- Replace the demo `h-marc-anna` with `crypto.randomUUID()` at creation. Never
  enumerable.

## Storage (later, for scan images)
- Supabase-style discipline on Firebase Storage: rules scoped to the household path,
  size/content-type limits, signed URLs. Extract data from a scan, then **downscale
  or delete** the original — don't hoard images.

## Keep-alive
- Firestore doesn't pause like Supabase, so no keep-alive cron is needed. (If you go
  Supabase instead, add the 3-day GitHub Actions ping from the tech-stack brief.)

---
Order: `SyncProvider` seam + `LocalSyncProvider` (no-op refactor, fully testable) →
Firebase project + rules + App Check → `FirebaseSyncProvider` + auth shell →
migrate → unguessable ids. Each step is small and verifiable.
