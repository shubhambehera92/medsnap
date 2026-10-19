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
| State | Zustand (with `persist` for auth + demo data) |
| Styling | Tailwind CSS v3 + design tokens (light/dark via CSS variables) |
| Motion | Framer Motion |
| Icons | Lucide React |
| PWA | `manifest.webmanifest` + service worker (`public/sw.js`) |
| Camera | `getUserMedia` → canvas, with upload & demo-image fallbacks |

The app runs entirely client-side with simulated data — **no backend is required**.

---

## 🚀 Quick start

Requires **Node ≥ 20.11**.

```bash
npm install          # install all workspaces
npm run dev          # web app on http://localhost:5173
```

Then open <http://localhost:5173>.

### Other scripts

```bash
npm run build        # production build → client/dist
npm run preview      # preview the production build
npm run typecheck    # TypeScript, no emit
npm run icons        # regenerate PWA icons (optional)
```

> The repo is an npm-workspaces monorepo. A `server/` workspace (Fastify) still
> exists from earlier iterations, but the current app does **not** depend on it.
> `npm run dev:api` / `npm run start` are available if you want to run it.

---

## ☁️ Deploy to Vercel

The repo ships with a `vercel.json` that builds the client and serves the SPA.

1. Push the repo to Git and **Import** it in Vercel.
2. Vercel detects the config automatically:
   - **Install:** `npm install`
   - **Build:** `npm run build` → outputs `client/dist`
   - **Rewrites** all non-`/api` routes to `index.html` (SPA routing).
   - `sw.js` is served with `Cache-Control: no-cache` so updates roll out.
3. Deploy. The service worker makes the app installable ("Add to Home Screen").

No environment variables are required.

---

## 🔑 Demo credentials

| Role | Email | Password | MFA code |
|---|---|---|---|
| Nurse | `sarah.johnson@medsnap.demo` | `demo123` | `123456` |
| Doctor | `michael.brown@medsnap.demo` | `demo123` | `123456` |
| Admin | `david.wilson@medsnap.demo` | `demo123` | `123456` |

- On the login screen, tap a role tab and **"Use demo credentials"** to autofill.
- The MFA step expects the fixed demo code **`123456`** (any role).
- Use the **Demo helper** (bottom-right floating button) to switch roles instantly
  without signing out, simulate being offline, force a blur retake, or make lists
  show an error state.

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
client/
  index.html
  public/              # manifest, service worker, PWA icons
  src/
    App.tsx            # routes + guards, mounts InactivityGuard / SyncManager / DemoHelper
    components/
      layout/          # Sidebar, BottomNav, TopBar, MainLayout, Logo
      ui/              # Button, Card, Input, Badge, Modal, Toast, WatermarkedImage, …
      capture/         # CaptureShell, Stepper
      InactivityGuard.tsx  SyncManager.tsx  DemoHelper.tsx
    screens/           # all 19 screens (auth, capture, nurse/doctor/admin, shared)
    stores/            # Zustand: authStore, appStore, captureStore, uiStore
    data/demo.ts       # seeded DEMO users, patients, photos, audit, chat, devices
    lib/               # audit helper, demo images, ocr/quality sim, utils
    types/             # shared TypeScript types
server/                # optional Fastify workspace (not required by the app)
```

---

## 📝 Notes & limitations

- All data is **simulated** and seeded from `src/data/demo.ts`. Mutations persist
  in `localStorage` (Zustand `persist`) — clear site data to reset the demo.
- Quality analysis ("blur/glare/dark") and text extraction are **deterministic
  simulations**, not real computer vision.
- "Upload", FHIR references (`DocumentReference/…`) and the sync queue are
  **simulated**; no network calls leave the browser.
- The diagnostic is not a medical device and outputs nothing clinically valid.
