# Richy's Eat

Multi-restaurant food delivery marketplace — customer, admin, and rider web
apps backed by a Node/Express API, Firebase (Auth/Firestore/Storage), and a
FastAPI analytics service.

See `docs/ARCHITECTURE.md` for the system overview, `docs/DATA_MODEL.md` for
the Firestore schema, `docs/ORDER_STATE_MACHINE.md` for order lifecycle
rules, and `docs/ASSUMPTIONS.md` for decisions made without explicit sign-off.

## Project layout

```
apps/customer-web    Vite + TS + Bootstrap — customer-facing site
apps/admin-web        Vite + TS + Bootstrap — platform admin + restaurant owner console
apps/rider-web         Vite + TS + Bootstrap — rider delivery app
services/backend      Express + WebSocket API
services/ai-service   FastAPI analytics/forecasting service
packages/shared-types TypeScript types shared by every app + the backend
packages/firebase-client  Firebase Web SDK wrapper (auth + init) shared by every frontend
infra/                Docker Compose, Firestore security rules
docs/                 Architecture, data model, roadmap, assumptions
```

## Local setup

Requires Node.js 20+, npm 10+, and Python 3.11+.

### 1. Install JS dependencies (installs all workspaces at once)

```bash
npm install
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/firebase-client
```

### 2. Configure environment variables

Each app/service has a `.env.example` — copy it to `.env` and fill in real
values:

```bash
cp apps/customer-web/.env.example apps/customer-web/.env      # Firebase web config
cp services/backend/.env.example services/backend/.env         # Firebase service account + secrets
cp services/ai-service/.env.example services/ai-service/.env   # Firebase service account
```

The Firebase **web config** (`VITE_FIREBASE_*`) is public/client-safe — from
Firebase Console → Project settings → General → Your apps.

The backend/AI service need a **service account** (Project settings → Service
accounts → Generate new private key) — this is a real secret. Never commit
it or paste it into a shared chat; only ever put it directly in your local
`.env` file, which is gitignored.

### 3. Run services

```bash
npm run dev:customer                     # customer-web on :5173
npm run dev --workspace=services/backend # backend on :4000 (or: cd services/backend && npm run dev)

cd services/ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Docker (backend + AI service only — frontends deploy to Firebase Hosting)

```bash
cd infra
docker compose up --build
```

## Status

All 9 phases from the original roadmap are built: auth, restaurant browsing/menus/cart/checkout, admin + rider dashboards, Paystack/Flutterwave payment integration (code complete, untested against live APIs — see `docs/ASSUMPTIONS.md` #11), notifications + messaging (backend complete, chat UI not built — #12), reservations (customer-side UI, owner-side pending — #13), AI analytics (tested logic, no dashboard UI — #14), and PWA support (customer-web only — #16).

Read `docs/ASSUMPTIONS.md` before you rely on any of this in production — it's the single most important file in this repo for understanding what's genuinely done vs. what compiles but has never touched a live Firebase project, live payment gateway, or live traffic.
all done