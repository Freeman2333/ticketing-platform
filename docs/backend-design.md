# Backend System Design — Ticketing Platform (Phase 1: Modular Monolith)

## 1. Goals and learning priorities

This backend exists primarily as a vehicle to learn NestJS in depth and to practice backend production patterns (concurrency, async workflows, caching, messaging) on a realistic domain: a mini ticketing platform (events, seat booking, orders).

The architecture is a **modular monolith**: one deployable NestJS app, internally split into modules with the same discipline as if they were separate services. This is deliberate — see [Why a monolith first](#12-why-a-monolith-first-and-how-it-becomes-microservices).

### NestJS feature checklist

Features this phase is built to exercise (checked items are in scope for Phase 1; the rest are named so the roadmap is visible from day one):

- [x] Modules, dependency injection, custom providers (DI tokens for cross-module interfaces)
- [x] Provider scopes, lifecycle hooks (`OnModuleInit`, `OnApplicationShutdown` for graceful shutdown)
- [x] Middleware, guards, pipes, interceptors, exception filters
- [x] DTOs with `class-validator` / `class-transformer`
- [x] `ConfigModule` with validated env schema
- [x] Terminus health checks
- [x] Swagger/OpenAPI generation
- [x] Passport strategies, JWT + refresh tokens, custom decorators, RBAC guards
- [x] `@nestjs/schedule` (cron jobs)
- [x] `EventEmitterModule` for in-process domain events
- [x] Testing: unit (Jest), e2e (Supertest), Testcontainers
- [ ] CQRS module (commands/queries/sagas) — later phase, once Orders has a real saga (payment)
- [ ] Microservice transports (RabbitMQ, Kafka, gRPC, TCP) — later phase, when modules are extracted
- [ ] Hybrid apps (HTTP + message consumer in one process) — later phase
- [x] WebSocket gateways / SSE (live seat availability) — moved into Phase 1 scope per `system-design.md` §3/§7
- [ ] GraphQL (one service, for comparison with REST) — later phase
- [x] File uploads (event posters, MinIO) — moved into Phase 1 scope per `system-design.md` §3
- [ ] Caching module (Redis) — later phase (seat locks, rate limiting)
- [ ] Dynamic providers / monorepo shared libs — introduced as the project grows

## 2. Module breakdown

Three modules in Phase 1, each a self-contained slice of the domain:

### `auth` module
- **Responsibility**: user registration/login, JWT issuance + refresh, role management.
- **Owns**: `auth` Postgres schema — `users`, `refresh_tokens` tables.
- **Public interface** (sketch): `AuthApi` — `validateUser()`, `issueTokens()`, `getUserById()`. Other modules that need "who is this user" (e.g. Orders needs the buyer's id) only ever get an id/role passed in via the request context — they never call into `auth` to look up a user.
- **Password hashing**: argon2id (`system-design.md` §8, A04). **JWT signing**: HS256.
- **Refresh flow**: the refresh token lives in an httpOnly/Secure/SameSite cookie, never in the request body (`system-design.md` §8, A07). `POST /auth/refresh` reads it from the cookie, and on success rotates it — the old refresh token is invalidated and a new one replaces it in the response cookie.

### `events` module
- **Responsibility**: event catalog, venues, seat maps, availability; the WebSocket gateway for live seat-availability updates (`system-design.md` §3/§4/§7 — owned here because `seats` belongs to this module's schema), built on **Socket.IO** (NestJS's default WS adapter) rather than raw `ws` — the Redis adapter for horizontal scaling (below) and the "room"-based scoping in §5 only exist for Socket.IO; event poster uploads to MinIO (`system-design.md` §3 — `posterUrl` is a field on `Event`), processed with **sharp** (resize, WebP conversion, `system-design.md` §8).
- **Owns**: `events` Postgres schema — `events`, `venues`, `seats` tables.
- **Public interface** (sketch): `EventsApi` — `getEvent(id)`, `listEvents(filter)`, `getSeatAvailability(eventId)`, `reserveSeats(eventId, seatIds)` (the last one marks seats as held; actual distributed locking is a later-phase concern — see roadmap). Poster upload and the WebSocket gateway are internal to this module, not part of the cross-module contract.
- **Note**: the gateway broadcasts within a single instance for now; the Redis pub/sub adapter that makes it work across multiple instances (`system-design.md` §8, Horizontal scaling) is added only once Redis itself arrives in Phase 2 — the gateway exists from Phase 1, the multi-instance fix doesn't yet.
- **Serving posters**: the bucket is public-read, served to the browser directly from a dedicated MinIO hostname behind the reverse proxy (§10) — not a presigned URL and not proxied through the backend. Presigned URLs were considered and rejected here specifically: they expire, which would conflict with the long-lived `Cache-Control` headers on posters and the Redis-cached event-details response (§ Scalability and performance) — both assume `posterUrl` stays stable. Uploading still goes through the backend (`POST /events/:id/poster`) regardless, since `sharp` has to process the file before it's written to MinIO.

### `orders` module
- **Responsibility**: order/booking lifecycle — `draft` → `reserved` → `paid` → `issued`, plus `cancelled` (`system-design.md` §5) — payment itself is a later phase; Phase 1 models the state machine and the happy path up to "reserved".
- **Owns**: `orders` Postgres schema — `orders`, `order_items` tables. A unique constraint on `order_items.seat_id` (among active order items) is part of the Phase 1 schema — a second, DB-level line of defense against double-booking alongside the Redis lock added in Phase 2 (`system-design.md` § Database performance); it doesn't depend on Redis existing yet.
- **Depends on**: `EventsApi` (to reserve seats and read event data) via DI token, never on `EventsService` directly.
- **Emits**: domain events (`order.created`, `order.reservation_expired`) via `EventEmitterModule`.
- **Hold expiry**: a `@nestjs/schedule` cron job periodically finds orders where `status = 'reserved' AND reserved_until < now()`, moves them to `cancelled`, releases the held seats via `EventsApi`, and emits `order.reservation_expired` — reusing the existing `cancelled` status rather than adding a separate "expired" state; the event name carries the distinction for listeners.
- **Future (Phase 4, not yet modeled)**: `Payment` and `Ticket` (`system-design.md` §5) will extend this module once the payment saga is built — not part of the Phase 1 schema.

## 3. Module isolation rules

These are hard rules, enforced by folder structure and lint, not just convention — they are the entire point of doing a modular monolith instead of a plain monolith:

1. **Each module owns its own Postgres schema.** Using Prisma's `multiSchema` preview feature, one `schema.prisma` file declares three schemas (`auth`, `events`, `orders`). No table in one schema has a foreign key into another schema. The same ownership principle extends to object storage: a module that stores files in MinIO (e.g. `events` for poster images) uses its own bucket/prefix, never a shared one.
2. **No cross-module JOINs.** If Orders needs the event title, it asks `EventsApi` for it (or stores a denormalized copy at order-creation time) — it never reads the `events` schema directly.
3. **`public/` vs `internal/` folder seam.** Each module exposes only what's under `modules/<name>/public/` (an interface + DTOs). Controllers, Prisma repositories, and internal services live under `modules/<name>/internal/` and are never imported from outside the module.
4. **No shared ORM entities.** Cross-module data passed around is always a plain DTO, never a Prisma model instance — so a module's internal schema can change without breaking callers.
5. **Enforced by tooling, not discipline.** Once the Nx workspace exists, an `@nx/enforce-module-boundaries` rule (tagged `scope:auth` / `scope:events` / `scope:orders`) fails the build on any `internal/` cross-import. (Scaffolding this is part of the implementation plan, not this doc.)

## 4. Cross-module communication pattern

Two patterns cover all cross-module interaction, chosen specifically because both have an obvious "what this becomes after extraction":

| Need | Phase 1 (monolith) | After extraction |
|---|---|---|
| Synchronous read/command (e.g. Orders needs to reserve seats) | DI-token interface (`EventsApi`), injected and called in-process | Swap the DI provider for an HTTP/gRPC client with the same interface — callers don't change |
| Side effect / notification (e.g. "an order was placed") | `EventEmitterModule`, in-process `emit`/`@OnEvent` | Swap the emitter for a RabbitMQ/Kafka publisher; consumers subscribe to the same event name/payload over the broker |

Concretely: `OrdersModule` depends on an `EVENTS_API` injection token typed as `EventsApi`. Today, `EventsModule` provides a local class implementing it. Later, a microservice client implementing the same interface gets provided instead, and `OrdersService` doesn't change a single line.

Domain events are modeled as immutable facts carrying all the data a listener would need (`OrderCreatedEvent { orderId, userId, eventId, seatIds }`), not as "go do X" commands — this is what makes them safe to replay/redeliver once they cross a real broker.

The WebSocket broadcast for live seat availability (`system-design.md` §3/§7) isn't a new cross-module communication need — it happens inside `EventsApi.reserveSeats()` itself, already called through the existing DI-token pattern above.

## 5. API specification

Conventions already fixed in `system-design.md` §6: REST documented via Swagger/OpenAPI, no versioning, one error shape across all endpoints, JWT bearer auth in the `Authorization` header; the WebSocket channel is separate from this REST surface.

**`auth`:**
- `POST /auth/register` — role chosen at signup is self-service for `attendee`/`organizer`; `admin` is never self-service, assigned out-of-band.
- `POST /auth/login`
- `POST /auth/refresh` — reads the refresh token from the httpOnly cookie, rotates it.
- `POST /auth/logout`
- `GET /auth/me`
- **Future (Phase 6, alongside the admin dashboard remote)**: user/role management endpoints (list users, change a user's role) — not designed yet.

**`events`:**
- `GET /events` — list with filters, public.
- `GET /events/:id` — details (venue, title, time, poster), cached (§ Performance).
- `GET /events/:id/seats` — kept separate from the above on purpose: seat availability is never cached, event details are, so splitting the endpoint lets each follow its own caching behavior.
- `POST /events` — `organizer` only.
- `PATCH /events/:id` — `organizer` + ownership check.
- `POST /events/:id/poster` — `organizer` + ownership check.
- `POST /venues` — `organizer`.
- `GET /venues` — the caller's own venues (so an organizer can pick one when creating an event).
- `GET /venues/:id` — ownership-checked.
- `PATCH /venues/:id` — ownership-checked.
- **WebSocket** (not REST): a client joins a room scoped to one event (e.g. `event:{id}`) and receives updates only for that event, not every event at once.

**`orders`:**
- `POST /orders` — body `{ eventId, seatIds }`; creates `Order` + `OrderItem`s, calling `EventsApi.reserveSeats()` internally. Authenticated attendee.
- `GET /orders` — the caller's own orders; `userId` comes from the JWT, never from a request parameter (A01, `system-design.md` §8).
- `GET /orders/:id` — ownership-checked.
- `PATCH /orders/:id/cancel` — ownership-checked, only when the order's state allows it.
- **Future (Phase 4, not yet)**: `POST /orders/:id/pay` — forward reference only, no details yet.

## 6. Request pipeline

- **Global `ValidationPipe`**: whitelists and validates all incoming DTOs (`class-validator`), transforms payloads (`class-transformer`).
- **Global middleware**: `helmet` (safe default HTTP security headers) and a CORS policy allowing only the known frontend origin (`system-design.md` §8, A02).
- **Guards**: `JwtAuthGuard` (validates access token), `RolesGuard` (checks `@Roles()` metadata against the authenticated user's role). A rate-limiting guard on the reservation endpoint is added in Phase 2, once Redis exists — not detailed here yet.
- **Interceptors**: a logging interceptor emitting structured JSON logs rather than plain text, a request-id middleware attaching a correlation id to every log line for the duration of a request (`system-design.md` §8, Observability), and a serialization interceptor (strips internal fields from responses via `class-transformer`'s `@Exclude()`).
- **Exception filters**: one global filter normalizing all errors into a single response shape (status, message, error code) — this shape is the contract the frontend relies on (see `integration-design.md`) — and never leaking a stack trace or other internal detail to the client (`system-design.md` §8, A10).

## 7. Security

**Auth & RBAC:**
- **Token flow**: login returns a short-lived access token (JWT, ~15 min) and a longer-lived refresh token (stored hashed in the `auth` schema, rotated on use).
- **Role model**: a `role` enum on `users` (`attendee`, `organizer`, `admin` to start). The JWT payload carries `sub` (user id) and `role`, so downstream guards never need a DB round-trip to check permissions.
- **Where checks live**: `RolesGuard` + `@Roles('organizer')` decorator on controller methods that need it (e.g. creating an event). Module-level business rules (e.g. "only the order's owner can cancel it") are checked in the service layer against the id in the request context, not via a generic guard.

**Rest of OWASP Top 10:2025 (`system-design.md` §8), as it applies to this backend:**
- Injection: Prisma parameterizes every query; raw SQL (if ever needed) must use a parameterized method, never string concatenation.
- Insecure design: already addressed by decisions elsewhere in this doc — the DB unique constraint on `order_items.seat_id` (§2), the Redis lock (Phase 2), rate limiting on reservation (Phase 2), TTL on holds.
- Integrity: Stripe webhooks are verified by signature before being trusted — a Phase 4 concern, not detailed further here yet.
- Misconfiguration: admin UIs (RabbitMQ, MinIO consoles, §10) bind to localhost only; no default credentials anywhere, even locally.
- Supply chain: `pnpm` lockfile committed; Dependabot enabled once the repo is on GitHub.

## 8. Data model sketch

Just enough to reason about module boundaries — full schema design happens when Prisma models are written, not in this doc.

```
auth.users            (id, email, password_hash, role, created_at)
auth.refresh_tokens   (id, user_id -> auth.users, token_hash, expires_at)

events.venues         (id, organizer_id, name, address)
events.events         (id, venue_id -> events.venues, title, starts_at, poster_url)
events.seats          (id, event_id -> events.events, label, status, price)

orders.orders         (id, user_id [opaque id, no FK], event_id [opaque id, no FK], status, reserved_until, created_at)
orders.order_items    (id, order_id -> orders.orders, seat_id [opaque id, no FK], price)
```

Note the deliberate asymmetry: foreign keys exist *within* a schema, never *across* schemas — `orders.orders.user_id` and `event_id` are just stored ids, validated at write time via the module's public API, not enforced by the database.

**Indexes** (`system-design.md` § Database performance): a composite index on `seats(event_id, status)` — the hot "available seats for event X" query — plus `orders.user_id`, `order_items.order_id`, `order_items.seat_id`.

**Migrations**: Prisma Migrate. `prisma migrate dev` locally generates and applies migration files against the local database; `prisma migrate deploy` applies already-generated migrations elsewhere (CI, any other environment) without generating new ones or allowing schema drift. Migration files are committed to the repo.

## 9. Testing strategy

- **Unit tests** (Jest): one suite per module's internal services, mocking the DI-token interfaces for cross-module dependencies (e.g. `OrdersService` tests mock `EVENTS_API`).
- **E2E tests** (Supertest + Testcontainers): spin up a real ephemeral Postgres per test run, migrate it, and hit the actual HTTP endpoints. `auth` gets the first full e2e suite (register → login → refresh → access a protected route) as the template the other modules copy.
- No mocked databases in e2e — only Testcontainers-backed real Postgres, to avoid the classic mock/prod divergence failure mode.

## 10. Local infrastructure

`docker-compose.yml` provisions four services from day one:

| Service | Wired into code in Phase 1? | Why provisioned now anyway |
|---|---|---|
| Postgres | Yes | Core datastore for all three modules |
| Redis | No | Needed soon for seat-hold locks, rate limiting, BullMQ — avoids a second infra bootstrap later |
| RabbitMQ | No | Needed when `EventsApi`/`EventEmitterModule` get extracted to real services |
| MinIO | Yes | Event poster uploads (`system-design.md` §3); public-read bucket, served to the browser directly (§2, `events` module) via its own dedicated hostname behind the reverse proxy — never mounted under a path on the main proxy, since MinIO's S3 request signing doesn't support that |

## 11. Scalability and performance

- **Connection pooling**: one shared `PrismaClient` and one connection pool for the whole Phase 1 monolith (auth/events/orders together), sized via an env variable.
- **Caching** (Phase 2): `GET /events` and `GET /events/:id` use the cache-aside pattern against Redis; invalidation is a short TTL plus an explicit cache-bust on `PATCH /events/:id`, so an organizer sees their own edit immediately.
- **Horizontal scaling**: see §2 (`events` module) — the Redis pub/sub adapter for the WebSocket gateway, added once Redis exists in Phase 2.
- **Async offloading**: notifications (Phase 3, via RabbitMQ) and ticket issuance (Phase 4, as a saga step) — not detailed further here yet, both out of Phase 1 scope.
- **Graceful degradation**: explicit timeouts on every outbound call (Postgres, Redis, Stripe, MinIO); Stripe calls use an idempotency key; the reservation endpoint fails closed (rejects new reservations) if Redis is unavailable, rather than falling back to the DB unique constraint alone.

## 12. Why a monolith first (and how it becomes microservices)

Splitting into services up front means guessing module boundaries before any code exists, and paying full distributed-systems cost (service discovery, network failures, distributed transactions) before learning NestJS fundamentals even once. Building the monolith with the seams above means every later extraction is mechanical:

- A DI-token interface call becomes a network call (HTTP/gRPC) — same interface, different implementation.
- An `EventEmitterModule` side effect becomes a message on RabbitMQ/Kafka — same event shape, different transport.
- A module's own Postgres schema becomes its own database — no cross-schema joins to untangle.

### Roadmap (not designed in this doc — named for context only)

1. **Phase 1 (this doc)**: modular monolith — auth, events, orders.
2. **Redis**: seat-hold distributed locks (TTL-based), rate limiting on the booking endpoint.
3. **Microservice extraction**: start with a TCP/Redis transport, then RabbitMQ; extract `notifications` first (lowest risk — no state to migrate).
4. **Saga + payments**: booking → payment → ticket-issuance flow with compensation, outbox pattern, idempotent consumers.
5. **Kafka + analytics**: event streaming, a MongoDB read model for sales stats.
6. **Production concerns**: observability (OpenTelemetry, Prometheus, Grafana, Loki, Jaeger), load testing (k6) on the ticket-sale-spike scenario, Kubernetes.
