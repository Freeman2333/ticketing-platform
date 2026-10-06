# Project Plan — Ticketing Platform (Learning Roadmap)

## 1. Purpose

This is a learning project, not a product. The priority is **backend depth** — NestJS covered as broadly as realistically possible (not just CRUD), plus microservices, message brokers, ORMs, Redis, and the surrounding production tooling a senior fullstack/backend dev is expected to know. On the frontend, the priority is learning **microfrontends** specifically, with everything else (React, data fetching) as support.

## 2. Domain: mini ticketing platform

A mini Ticketmaster-style app (events, venues, seat booking, orders). This domain was chosen over generic CRUD because it naturally produces real problems that justify the tools being learned, rather than forcing them in artificially:

- **Concurrency** — two people grabbing the last seat → Redis distributed locks, DB transactions.
- **Async workflows** — order → payment → ticket issuance → email → message brokers, sagas.
- **Traffic spikes** — a popular sale opening → queues, caching, rate limiting.
- **Real-time** — live seat availability → WebSockets/SSE.

## 3. Overall strategy

Build a **modular monolith** first (one NestJS app, strict module seams), then mechanically extract real microservices once the monolith works. Rationale (already settled, not re-litigated here): starting distributed means guessing module boundaries before any code exists and paying the full cost of distributed systems before learning NestJS fundamentals even once. The full reasoning and the specific module-isolation rules that make the later split mechanical live in [`backend-design.md`](./backend-design.md).

## 4. Locked technology decisions

These were decided in planning discussion and apply across all phases unless a later phase explicitly revisits one:

| Area | Decision |
|---|---|
| Monorepo | Nx |
| Package manager | pnpm |
| Backend framework | NestJS |
| Database | PostgreSQL |
| ORM | Prisma only, across all modules (ORM diversity across services was considered and dropped — one less variable while learning NestJS itself) |
| Cache / locks / queues | Redis (caching, distributed seat-hold locks, rate limiting, BullMQ, pub/sub) |
| Message brokers | RabbitMQ first (work queues, retries, DLQ), Kafka later (event streaming, consumer groups, replay) |
| Object storage | MinIO (S3-compatible) |
| Local infra | Full `docker-compose.yml` from day one (Postgres, Redis, RabbitMQ, MinIO) even before all of them are wired into code, so the environment never needs re-bootstrapping mid-project |
| Frontend architecture | Microfrontends via Module Federation |
| Frontend tooling | Nx's Rspack-based Module Federation generators (shell host + remotes), not hand-wired Vite MF, not Next.js MF (currently less stable) |
| Data fetching | TanStack Query, typed client generated from the backend's OpenAPI spec |
| Auth | Passport JWT + refresh, RBAC guards now; OAuth2/OIDC via Keycloak considered for a later phase |
| Testing | Jest (unit), Supertest + Testcontainers (e2e, real ephemeral Postgres — no mocked DB) |
| CI/CD | GitHub Actions (introduced once there's more than one phase to protect against regressions) |
| Observability (later) | OpenTelemetry, Prometheus, Grafana, Loki, Jaeger |
| Load testing (later) | k6, targeted at the ticket-sale-spike scenario |
| Orchestration (later) | Kubernetes, once the monolith is actually split into services |

## 5. Phased roadmap

Each phase builds on the previous one; later phases are intentionally not designed in detail yet — they get system-design documents of their own when their turn comes.

1. **Phase 1 — Modular monolith + first microfrontend pair.** One NestJS app with `auth`, `events`, `orders` modules (strict module seams, Prisma multiSchema), Swagger, guards/pipes/interceptors, Terminus health checks, `EventEmitterModule` for in-process side effects, `@nestjs/schedule` for reservation expiry, a WebSocket gateway for live seat-availability updates, and event poster uploads to MinIO (`system-design.md` §3/§7). In parallel: an Nx Module Federation `shell` (host) + `catalog` (first remote) consuming the API. Full `docker-compose.yml` stood up now. *This is the phase currently being designed — see §6.*
2. **Phase 2 — Redis.** Seat-hold distributed locks (TTL-based) to solve the "last seat" race, rate limiting on the booking endpoint, response caching where it matters.
3. **Phase 3 — Microservice extraction.** Start with a TCP/Redis transport to feel the shape of the problem, then move to RabbitMQ. Extract `notifications` first (lowest risk, no state to migrate), add BullMQ for queued email/push work.
4. **Phase 4 — Saga + payments.** Stripe (test mode) integration; booking → payment → ticket-issuance flow with compensation on failure, outbox pattern, idempotent consumers. First real use of the CQRS module if it fits naturally here.
5. **Phase 5 — Kafka + analytics.** Event streaming for sales/usage events, consumer groups, replay; a MongoDB read model for analytics, separate from the transactional Postgres schemas.
6. **Phase 6 — Microfrontend expansion.** Add the remaining remotes (checkout/cart, account/orders, admin dashboard). Introduce cross-MFE communication (shared event bus / shared auth state) only once a second remote creates a real need for it — not speculatively in Phase 1.
7. **Phase 7 — Production concerns.** Observability stack (OpenTelemetry/Prometheus/Grafana/Loki/Jaeger), load testing with k6 on the sale-spike scenario, CI/CD via GitHub Actions, Kubernetes once services are actually split.

## 6. Documentation structure

This plan document is the single source of truth for **scope and sequencing** — what gets built, in what order, and why. It does not contain implementation-level architecture.

[`system-design.md`](./system-design.md) sits above the phase-specific documents below — it fixes "what" the whole product is (functional requirements, data model, cross-cutting concerns) and the constraints the documents below must stay consistent with. It was written after `backend-design.md` and an initial pass of `frontend-design.md` already existed, so both were then reconciled against it; new phase-specific documents going forward should be checked against it as they're written, not after the fact.

Each phase that's actively being designed also gets its own detailed system-design document(s), built *from* this plan and `system-design.md`, not instead of them:

- [`backend-design.md`](./backend-design.md) — Phase 1 backend architecture (module breakdown, isolation rules, request pipeline, API specification, security, data model, scalability, testing strategy).
- [`frontend-design.md`](./frontend-design.md) — Phase 1 frontend architecture (shell/remote split, Module Federation setup, data fetching, WebSocket consumption, performance, accessibility, rendering strategy).
- [`integration-design.md`](./integration-design.md) — how the Phase 1 backend and frontend connect (env/config contract, local dev topology).

When Phase 2+ work starts, it gets its own design doc(s) (e.g. `redis-design.md`, `extraction-design.md`) rather than retrofitting the Phase 1 docs — each doc stays scoped to the phase it was written for, with this plan as the index tying them together.

## 7. Status

- [x] Project plan (this document)
- [x] `system-design.md` — written after the two below, then used to reconcile them
- [x] `backend-design.md` (Phase 1) — reconciled against `system-design.md`
- [x] `frontend-design.md` (Phase 1) — reconciled against `system-design.md`
- [x] `integration-design.md` (Phase 1) — env/config contract, local dev topology
- [x] Code scaffolding plan — see §8

## 8. Phase 1 implementation plan

Organized as vertical feature slices (backend + frontend together for each), not by layer — this is what the locked-in API contract (`frontend-design.md` §4) makes possible.

0. **Infrastructure foundation** (blocks everything else): Nx workspace, `docker-compose.yml`, bare `shell`/`catalog` app skeletons, baseline `libs/ui` (shadcn/Tailwind setup), and an early Swagger/OpenAPI stub on the backend — so `libs/api-client` can be generated from day one instead of waiting on full endpoint logic.
1. **Auth**: backend `auth` module (`backend-design.md` §2) together with `shell`'s `LoginPage`/`RegisterPage`/`AuthBootstrap`/`@ticketing/auth-client` (`frontend-design.md` §2).
2. **Events/Catalog**: backend `events` module — venues, events, seats, WebSocket gateway, poster upload (`backend-design.md` §2) — together with `catalog`'s `EventList`/`EventDetailsPage`/`SeatMap`/`useSeatAvailability` (`frontend-design.md` §2).
3. **Orders/Booking**: backend `orders` module — reservation, cancellation, hold-expiry cron (`backend-design.md` §2) — together with `catalog`'s `ReservationPanel`/`ReserveButton` (`frontend-design.md` §2). Depends on Events (seats must exist to book) and Auth (booking requires a logged-in user).
4. **Integration verification**: the full browse → reserve key flow (`system-design.md` §7) working end-to-end.
