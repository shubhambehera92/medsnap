# MedSnap 🩺📸 — Secure clinical photo capture PWA

A mobile-first, installable **PWA** that lets nurses capture wound / medicine-label
photos **on the ward without WhatsApp**, verifies the patient, captures consent,
and files each capture to the record with a full, append-only **audit trail**.

Built for **Techbuzzers — Hackyard Round 2**.

**🔴 Live demo:** <https://medsnap-live.vercel.app>

> ⚠️ **DEMO DATA ONLY.** Every patient, photo, message and audit entry in this app
> is simulated and clearly labelled "DEMO DATA". No real patient data or real
> clinical photos are used or stored. Do not use with real patient information.

---

## ✨ What's inside

- **Auth & roles** — Login → MFA → role-routed home for **Nurse / Doctor / Admin**.
  Five failed logins lock the account; idle sessions auto-logout with a 15-second
  "Still there?" countdown.
- **Capture flow** — Photo type → camera (or upload / demo image) → quality gate
  (blur / glare / dark retake) → type confirmation → patient verification (with a
  "hold in vault" branch) → consent (record / skip / revoke) → filed receipt with
  an online FHIR `DocumentReference` reference or an offline encrypted queue.
- **Offline-first** — Offline toggle + banner, an encrypted queue, and a global
  `SyncManager` that auto-files queued photos the moment you're back online.
- **Photo viewer** — Diagonal repeated watermark (viewer + timestamp), no plain
  download, right-click / long-press save disabled, export requires a reason.
- **Audit everything** — Every meaningful action writes an append-only,
  non-editable audit entry. Admins can search and export the log to CSV.
- **Admin console** — Users & roles, security / retention / consent policies,
  audit log, and device management with remote wipe + confirmation.
- **Demo helper** — Discreet floating button for quick role switching (no
  re-login), offline toggle, forced blur-retake, and a simulated list-error toggle.
- **Real data layer** — All demo data is served by a small REST API backed by a
  real database (Postgres in production, SQLite locally). Captures, comments,
  consent changes, messages and audit entries persist server-side.

### Screens (19)

Login · MFA · Nurse Home · Mode Picker · Camera · Preview · Verify Patient ·
Consent · Filed Receipt · Sync Queue & Held · Patient Record · Photo Viewer ·
Doctor Inbox · Team Chat · Settings · Admin: Home / Users / Policies / Audit /
Devices.

---

## 🧱 Stack

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript + Vite 6 |
| Routing | React Router v6 |
| State | Zustand — API-backed stores, seeded demo data as offline fallback (`persist` for auth only) |
| Styling | Tailwind CSS v3 + design tokens (light/dark via CSS variables) |
| Motion | Framer Motion |
| Icons | Lucide React |
| PWA | `manifest.webmanifest` + service worker (`public/sw.js`) |
| Camera | `getUserMedia` → canvas, with upload & demo-image fallbacks |
| API | Fastify 5 — local server + Vercel serverless function at `/api` |
| Database | **Supabase Postgres** (production) · **SQLite** (local dev, zero-config) |

The client reads and writes every demo entity through the REST API (`/api`).
Locally the API runs on SQLite; in production it runs as a Vercel function
against Supabase Postgres. If the API is unreachable, the stores fall back to the
seeded demo dataset so the demo never breaks.

---

## 🚀 Quick start

Requires **Node ≥ 20.11**.

```bash
npm install                 # install all workspaces
npm run dev:api             # API   → http://localhost:3001  (SQLite, auto-seeded)
npm run dev                 # PWA   → http://localhost:5173  (/api proxied to :3001)
```

Then open <http://localhost:5173>.

The Vite dev server proxies `/api` to `http://localhost:3001`, so run the API
alongside the client. With no `DATABASE_URL` set, the API uses a local SQLite
file (`server/data/medsnap.db`) that is **created and seeded automatically** from
the demo dataset on first boot.

### Other scripts

```bash
npm run build        # production build → client/dist
npm run preview      # preview the production build
npm run typecheck    # TypeScript, no emit
npm run seed         # (re)seed the demo database (add -- --reset to wipe + reseed)
npm run icons        # regenerate PWA icons (optional)
```

> npm-workspaces monorepo: `client/` (the PWA) and `server/` (the Fastify API).
> The same API code powers both the local server and the Vercel function.

---

## 🗄️ API & database

Base path `/api`. This is an **open demo API** — there is no auth enforcement and
no real patient data (the login/MFA flow stays entirely client-side).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness + active backend (`sqlite` \| `postgres`) |
| `GET` `POST` `PATCH` | `/api/users` · `/api/users/:id` | Team members & roles |
| `GET` `PATCH` | `/api/patients` · `/api/patients/:id` | Patient records + consent |
| `GET` `POST` `PATCH` `DELETE` | `/api/photos` · `/api/photos/:id` | Captures (create / comment / remove) |
| `GET` `POST` | `/api/audit` | Append-only audit trail (`?limit=`) |
| `GET` `POST` | `/api/chat/threads` · `/api/chat/messages` | Team chat (`?threadId=`) |
| `GET` `PATCH` | `/api/devices` · `/api/devices/:id` | Ward devices + remote wipe |
| `GET` `PUT` | `/api/settings` | Security / retention / consent policy |

Upserts keep the same `id`, so the client can push locally created rows. The
server fills only demo-safe defaults (e.g. a photo's `id`/`takenAt`). Errors are
always JSON: `{ "error": "message" }`.

### Environment

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` *or* `POSTGRES_URL` | – | Postgres connection string. When unset the API uses local SQLite. **Required on Vercel.** |
| `PORT` | `3001` | Local server port |
| `HOST` | `0.0.0.0` | Local server host |
| `MAX_UPLOAD_BYTES` | `15728640` | Max request body (base64 image) |

Copy `server/.env.example` to `.env` and fill in `DATABASE_URL` to run against
Postgres locally. The schema and demo seed are created automatically on first
boot; `npm run seed -- --reset` rebuilds them from scratch.

---

## 🚀 Deploying to Vercel

1. Import the repo into a Vercel project. `vercel.json` already sets the
   framework, build command, output directory, the `api/index.mjs` function and
   the SPA rewrites.
2. Create a **Supabase Postgres** project and copy the **Connection pooling**
   (Transaction pooler, port `6543`) connection string.
3. Add it to the project's environment as `DATABASE_URL` (Production):

   ```bash
   vercel env add DATABASE_URL production   # paste the pooler URI
   ```
4. Deploy. The function creates the schema and seeds the demo data on first boot.

   ```bash
   vercel --prod
   ```

Verify the API is live and using Postgres:

```bash
curl https://<your-app>.vercel.app/api/health
# {"ok":true,"service":"medsnap-api","db":"postgres","time":"..."}
```

Without `DATABASE_URL` the deployed function refuses to start — the app still
loads but falls back to the client's seeded demo data.

---

## 🎨 Design system

- **Primary** teal `#0F766E` (hover `#0D5F59`, light `#CCFBF1`).
- **Neutrals** ink `#0F172A` / `#475569` / `#94A3B8`, bg `#F6F8FB`, surface `#FFFFFF`, border `#E2E8F0`.
- **Semantic** success `#16A34A`, warning `#D97706`, danger `#DC2626`, info `#2563EB` (each with a tint).
- Inter font, spacing on an 8px grid, 16px card radius, 12px inputs/buttons, pill badges, soft shadows.
- **Dark mode** via `prefers-color-scheme` (driven by CSS variables). The camera
  screen is always dark.
- **Responsive:** mobile `<768px` (single column + bottom nav + bottom-sheet modals),
  tablet `768–1199px`, desktop `≥1200px` (left sidebar + top bar + master-detail).
  Tables become cards on mobile; safe-area insets respected; no horizontal scroll.

---

## 📁 Project structure

```
api/
  index.mjs            # Vercel serverless entry → buildApp() from server/src
client/
  index.html
  public/              # manifest, service worker, PWA icons
  src/
    App.tsx            # DataBootstrap + routing, offline/sync bootstrapping
    components/        # shells, viewer, demo helper
    screens/           # Login → capture → filed; nurse/doctor/admin screens
    stores/            # Zustand stores (appStore hydrates from the API)
    lib/api.ts         # typed REST client for /api
    data/demo.ts       # seeded DEMO_* data (also the offline fallback)
    types/index.ts     # shared DTO types (source of truth for the API)
server/
  src/
    index.js           # buildApp(): Fastify app used locally and on Vercel
    db.js              # Postgres vs SQLite switch (DATABASE_URL / POSTGRES_URL)
    db-pg.js           # Postgres backend (Supabase / Neon) + idempotent schema
    db-sqlite.js       # SQLite backend for local dev
    schema.js          # single source of truth for tables/indexes
    mappers.js         # DB row → API DTO mapping
    seed.js            # demo seed (--reset supported)
    routes/            # users, patients, photos, audit, chat, devices, settings
  scripts/             # smoke + serverless + live verification
```

---

## ⚙️ Configuration

The client needs no configuration — it calls `/api` on the same origin.
Set these in the Vercel project (Production) or in a local `.env`:

```bash
# Postgres connection string (Supabase → Connect → Connection pooling URI).
# Required on Vercel; omit locally to use SQLite.
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

# Optional local server overrides
PORT=3001
HOST=0.0.0.0
MAX_UPLOAD_BYTES=15728640
```

`.env*` files are git-ignored. Never commit a real connection string or password.

---

## 📝 Notes

- All entities are stored server-side (Postgres/SQLite). The seeded `DEMO_*`
  dataset in `client/src/data/demo.ts` is applied to a fresh database on first
  boot and also acts as the client's offline fallback.
- Photos are stored as base64 `imageData` in the database for the demo; no object
  storage is used.
- Quality analysis ("blur/glare/dark") and text extraction are **deterministic
  simulations**, not real computer vision.
- The diagnostic is not a medical device and outputs nothing clinically valid.
