# Richy's Eat — Architecture Overview

## Services

| Service | Path | Stack | Responsibility |
|---|---|---|---|
| Customer Web | `apps/customer-web` | Vite + TS + Bootstrap, PWA | Browse restaurants/menus, cart, checkout, reservations, reviews, order tracking, messaging |
| Admin Web | `apps/admin-web` | Vite + TS + Bootstrap | Platform admin (restaurant onboarding, riders, commission, platform analytics) + restaurant owner console (menu/orders/inventory/staff), routed by role |
| Rider Web | `apps/rider-web` | Vite + TS + Bootstrap, PWA | Accept deliveries, update order status, share live location |
| Backend API | `services/backend` | Node.js + Express + TypeScript + WebSocket (`ws`) | REST API, auth middleware, order orchestration, payment webhooks, real-time events |
| AI Service | `services/ai-service` | FastAPI + Pandas + NumPy + Scikit-learn | Demand forecasting, revenue trends, customer segmentation, anomaly detection, reports |
| Firebase | managed cloud | Auth, Firestore, Storage | Identity, primary datastore, file storage (menu images, logos) |

`packages/shared-types` holds TypeScript types (Order, MenuItem, User, Restaurant,
etc.) generated from `docs/DATA_MODEL.md`, imported by all three frontends and
the backend so the shape of an "Order" can't drift between apps.

## Request flow (order placement)

```
customer-web --REST--> backend --writes--> Firestore (orders)
backend --initiates--> Paystack/Flutterwave checkout
payment provider --webhook--> backend --updates--> Firestore (orders.paymentStatus)
backend --WS broadcast--> customer-web, admin-web (restaurant view)
restaurant accepts --REST--> backend --WS broadcast--> customer-web, rider-web (new job pool)
rider accepts --REST--> backend --WS broadcast--> customer-web, admin-web
rider location updates --WS--> backend --relay--> customer-web (live map)
```

Firestore is the source of truth; the backend does **not** duplicate data, it
orchestrates writes, enforces business rules Firestore security rules can't
express alone (e.g. commission calculation, state machine validation), and
bridges to WebSocket + external payment/AI services.

## Why a Node backend in front of Firestore at all?

Frontends *could* talk to Firestore directly via the Firebase SDK for reads
and simple writes (and will, for things like live order status listeners).
The backend exists for everything that needs server-side trust: computing
commission/totals, validating state transitions, verifying payment webhooks,
broadcasting WebSocket events, and calling the AI service. This is a hybrid
model, not a replace-Firestore-with-REST model.

## Deployment topology (Phase 9 target)

```
                         ┌────────────────────┐
                         │  Firebase Hosting   │  customer-web / admin-web / rider-web (static builds)
                         └─────────┬────────────┘
                                   │
                         ┌─────────▼────────────┐
                         │   Backend (Express)   │◄──── Render/Railway, Dockerized
                         │   + WebSocket server   │
                         └─────────┬────────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
           Firestore/Auth    AI Service (FastAPI)   Paystack/Flutterwave
           /Storage (GCP)    Dockerized                (external)
```

CI/CD via GitHub Actions: lint + typecheck + test on PR, build + deploy on
merge to `main`.
