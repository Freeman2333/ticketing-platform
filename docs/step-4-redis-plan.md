# Step 4 Implementation Plan — Redis Seat-Hold Locking

## Status

Not started. Breaks `project-plan.md` §5 Phase 2 (seat-hold locking portion only — rate limiting is a separate, not-yet-designed piece of Phase 2, tracked separately) into concrete, ordered tasks, citing the decisions already locked in `redis-design.md`. Depends on Step 3 (Orders) being done, since this wraps the existing `EventsApi.reserveSeats()`.

## Part A — Redis wired into the backend

- [x] `ioredis` added as a backend dependency (`redis-design.md` §5).
- [x] `REDIS_URL` added to `.env`/`.env.example` (`redis://localhost:6379`, matching the already-running `docker-compose.yml` `redis` service — no password set there yet, same as `DATABASE_URL`'s pattern).
- [x] `RedisModule` (`@Global()`): one shared `ioredis` client instance behind a DI token, constructed from `REDIS_URL` — analogous to the existing shared `PrismaService` (`redis-design.md` §6). No lock-specific logic here, just the connection.

## Part B — Seat lock in the `events` module

Superseded 2026-10-19: the first pass (checked off below, then reverted) used a per-seat loop with a 5-minute TTL matching the hold duration, and a third `lockTtlMs` parameter on `reserveSeats()`. Research into how production seat-reservation systems actually do this (`redis-design.md` §2/§3) showed this conflated two separate concerns — the lock should be scoped to one request's critical section (seconds), not the whole hold (minutes) — which is what made cleanup on cancel/expiry seem to need a persisted token in the first place. Corrected plan below; `redis-design.md` is already rewritten to match, code is not yet.

- [x] `SeatLockService` rewritten (`redis-design.md` §3) around a single Lua script acquiring **all** requested seats' locks atomically (check every key absent, then set every key, inside one script) — not a per-seat loop with application-level rollback. TTL is a short, internal constant (seconds, crash-safety only), not a parameter from the caller.
- [x] `EventsApi.reserveSeats(eventId, seatIds)` — signature **reverted** to its original two parameters (the `lockTtlMs` parameter from the superseded pass is removed; TTL is `events`-internal, `orders` never supplies it):
  1. Acquire all locks in one atomic script.
  2. Acquisition failure → same conflict thrown as today, before touching Postgres — nothing was written to Redis, nothing to release.
  3. Acquisition succeeds → `try { run the existing conditional updateMany } finally { release all locks }` — the lock is released immediately after this attempt, success or failure, never left to expire on its own.
- [x] `OrdersService.createOrder()`'s call site reverted to passing only `(eventId, seatIds)` — no `HOLD_DURATION_MS` third argument.
- [x] Confirmed by design (`redis-design.md` §4): `OrdersService.cancelOrder()` and `HoldExpiryCron` need zero changes — they never touch Redis, since the lock from the original `reserveSeats()` call is always already gone by the time either of them runs.

## Part C — Fail-closed behavior and verification

- [x] Confirm the reservation endpoint fails closed if Redis is unreachable (`backend-design.md` §11). First attempt failed: `ioredis`'s default `enableOfflineQueue: true` queued the command instead of rejecting it, so a request issued while Redis was down just hung (client timed out) and then silently succeeded once Redis came back seconds later — not a clean rejection. Fixed by setting `enableOfflineQueue: false` and `commandTimeout: 5000` on `RedisService`. Re-tested: stopping Redis now gets an immediate (~0.1s) 500 and the seat is confirmed untouched, instead of a delayed, invisible success.
- [x] Manual concurrency test: fired 8 parallel `POST /orders` for the same seat — exactly one `201`, the other seven `409`, confirmed via `docker exec ... redis-cli KEYS "lock:seat:*"` returning empty immediately after (the lock released itself within the same request, as designed).
- [x] Confirm `HoldExpiryCron`/`cancelOrder` still correctly release seats — verified via manual cancel: seat flipped back to `available` immediately, and the same seat could be re-reserved (`201`) right after with zero leftover Redis lock blocking it.

## Part D — Rate limiting on the reservation endpoint

Per `redis-design.md` §7.

- [x] `@nestjs/throttler` and `@nest-lab/throttler-storage-redis` added as backend dependencies.
- [x] `ThrottlerModule.forRootAsync()` registered in `AppModule`, injecting the existing `RedisService` (not a second connection): `throttlers: [{ limit: 10, ttl: seconds(60) }]`, `storage: new ThrottlerStorageRedisService(redis)`, `getTracker: (req) => req.user.sub`. No custom `Guard` subclass needed — confirmed by reading `@nestjs/throttler`'s own type definitions before implementing that `getTracker` is a plain config option, not something that requires subclassing `ThrottlerGuard` (the plan originally assumed it would).
- [x] `ThrottlerGuard` applied via `@UseGuards(ThrottlerGuard)` directly on `OrdersController.createOrder()` only — not registered as a global `APP_GUARD`, since only the reservation endpoint is in scope here (`redis-design.md` §1).
- [x] Verification: fired 11 sequential `POST /orders` from one user — 1st succeeded (`201`), 2nd-10th got `409` (seat already held, a normal business conflict that still counts as a hit), 11th got `429`. A second user's own first attempt immediately after still succeeded (`201`) — confirms the tracker is genuinely per-`userId`, not shared or IP-based.

## Not in this step

- Response caching for `GET /events`/`GET /events/:id` — separate concern (`backend-design.md` §11).
- Redlock / multi-node Redis — explicitly rejected in `redis-design.md` §3; single-node lock only.
