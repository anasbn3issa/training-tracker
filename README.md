# Training Tracker

Single-user, phone-first tracker for one fixed lifting program (4 days/week) plus runs.
Next.js (App Router) + Supabase Postgres + Tailwind.

## Local setup

Prerequisites: Node 24, Docker.

```bash
npm install
npm run db:start        # local Supabase in Docker: applies migrations + seed on first start
cp .env.example .env.local
npx supabase status -o env   # copy API_URL -> SUPABASE_URL, SECRET_KEY -> SUPABASE_SECRET_KEY
# set AUTH_SECRET and PASSWORD_ANAS / PASSWORD_ATEF in .env.local
npm run dev
```

Supabase Studio (local DB browser) runs at http://127.0.0.1:54323.

## Environment variables

| Variable              | What                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `SUPABASE_URL`        | Supabase API URL                                                   |
| `SUPABASE_SECRET_KEY` | Supabase secret (service-role) key. Server-side only, bypasses RLS |
| `PASSWORD_ANAS`       | Anas's password. One `PASSWORD_<ID>` per user (see `src/lib/users.ts`) |
| `PASSWORD_ATEF`       | Atef's password |
| `AUTH_SECRET`         | Signs the login cookies (`openssl rand -base64 32`). Rotating it logs every device out |

The browser never talks to Supabase directly: all reads/writes go through `/api/*` route handlers.
RLS is enabled on every table with no policies, so the public keys can access nothing.

## Database

- Schema: `supabase/migrations/`
- Program (exercises, days, prescriptions, block start date): `supabase/seed.sql`

The program is changed by editing `seed.sql`. The seed is safe to re-run on a database that
already holds logged sessions:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

`npm run db:reset` rebuilds the **local** database from scratch (wipes logged data).
After a schema change, regenerate the TypeScript types with `npm run db:types`.

## Users

Each user logs in with their name + own password and only sees their own sessions, sets and runs;
the program is shared. Each user has their own block start (`users.block_start_date`), changed by
the −/+ on Today (saved). To add a user: insert a row in `users`, add them to `src/lib/users.ts`,
and set `PASSWORD_<ID>` in Vercel.

## Scripts

| Script             | What                                  |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Next.js dev server                    |
| `npm test`         | Unit tests (Vitest)                   |
| `npm run db:start` | Start local Supabase                  |
| `npm run db:stop`  | Stop local Supabase                   |
| `npm run db:reset` | Recreate local DB (migrations + seed) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` |

## Offline behaviour

Writes never wait on the network. They are applied to local state, saved to IndexedDB with an
outbox of pending ops, then sent to `/api/sync` in the background with retry (`src/lib/sync.ts`).
On load the app shows the IndexedDB copy first, then pulls server state and replays any pending
ops on top (last write wins).

## PWA

- Manifest: `src/app/manifest.ts` (served at `/manifest.webmanifest`). Icons in `public/icons/`
  (source: `public/icons/icon.svg`).
- Service worker: `public/sw.js`, registered in production builds only. Pages are network-first with
  a 3 s timeout and a cached fallback; `/_next/static` is cache-first; `/api` is never cached.
  Each build gets its own cache (`/sw.js?v=<build id>`).
- Install on Android: open the URL in Chrome → menu → *Add to Home screen* / *Install app*.

## Deploy (Vercel + hosted Supabase)

1. Hosted DB (once, and after each new migration):
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```
2. Vercel: import the GitHub repo, then set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `APP_PASSWORD`,
   `AUTH_SECRET` for Production. Every push to `main` deploys.
3. Functions run in `dub1` (Dublin, `vercel.json`), next to the Supabase project in `eu-west-1`.
