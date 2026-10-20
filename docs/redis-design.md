# Redis Design — Phase 2 (Seat-Hold Locking)

## 1. Scope

Phase 2 per `project-plan.md` §5: Redis-backed seat-hold locking (§2-§6) and rate limiting on the booking endpoint (§7).

Redis is already provisioned in `docker-compose.yml` (added ahead of time during Phase 1 infra setup) but not yet wired into any backend code.

## 2. Why a lock in front of the existing Postgres check

Phase 1's `EventsApi.reserveSeats()` already prevents double-booking correctly via a conditional `updateMany({ where: { status: 'available' }, data: { status: 'held' } })` — a single atomic Postgres statement. That check stays and remains the authoritative source of truth; Redis does not replace it.

What it doesn't handle well: **contention under a sale spike**. Concurrent requests for the same few remaining seats all serialize on the same Postgres rows — the primary datastore becomes the bottleneck exactly when load is highest. Redis sits in front of the Postgres check as a fast, in-memory pre-filter: most losing requests under contention get rejected in Redis, never touching Postgres at all.

This is the lock's **only** job. It does not represent the reservation hold itself — that's a separate, longer-lived fact that lives entirely in Postgres (`Seat.status = 'held'`, `Order.reservedUntil`). The lock's lifetime is scoped to a single `reserveSeats()` call (milliseconds), not to the 5-minute hold window — conflating the two was an earlier mistake in this doc, corrected 2026-10-19 after researching how production seat-reservation systems actually do this (see §3).

## 3. Lock mechanism

One atomic Lua script acquires locks for **every requested seat at once** — not a per-seat loop with application-level rollback on partial failure:

```
-- KEYS = lock:seat:{eventId}:{seatId}, one per requested seat
-- ARGV[1] = token, ARGV[2] = short TTL in ms
for i, key in ipairs(KEYS) do
  if redis.call('exists', key) == 1 then return 0 end
end
for i, key in ipairs(KEYS) do
  redis.call('set', key, ARGV[1], 'PX', ARGV[2])
end
return 1
```

- Checking that every key is absent before writing any of them, inside one Lua script, means the whole check-then-set is atomic — either every seat locks or none do. No partial-lock state ever exists, so there's nothing to compensate for on a partial failure.
- `{token}` is a random value unique to the attempt — needed so release can verify ownership (see below).
- TTL is **short** (a few seconds — enough to cover one request's worst-case latency plus a margin, not the hold duration). Its only purpose is crash safety: if the backend process dies mid-request, the lock still clears itself eventually instead of blocking the seat forever. It is never relied on for the normal path.
- Release — a compare-and-delete Lua script (check `{token}` matches before `DEL`, same reasoning as before) — runs **immediately** after the Postgres attempt, success or failure, inside a `try/finally` in `reserveSeats()`. The lock never survives past the single call that created it.
- If acquisition itself fails (some seat already locked), nothing was written to Redis on that attempt — there is nothing to release, just an immediate conflict thrown before Postgres is touched at all.

Single-node Redis lock, not the multi-node Redlock algorithm — Postgres remains the authoritative check, so Redis only needs to be a good-enough fast filter, not a standalone consensus mechanism. (Redlock's own safety guarantees are disputed — see Kleppmann vs. antirez — and that rigor isn't needed when a second, authoritative layer already exists.)

## 4. Hold expiry

`HoldExpiryCron` and `OrdersService.cancelOrder()` need **no Redis awareness at all** — they only ever run well after the original `reserveSeats()` call already released its lock (§3), so there is nothing left in Redis for them to clean up. This is a direct consequence of scoping the lock to the request rather than the hold: the two problems ("is this the same seat being double-booked right now" vs. "when does an unpaid hold expire") are fully decoupled, each owned by exactly one system (Redis for the former, Postgres + the cron for the latter).

## 5. Client library

`ioredis`, not the official `redis` (node-redis) package — decided ahead of actual need because `project-plan.md`'s Phase 3 already commits to BullMQ for queued notification work, and BullMQ requires `ioredis` specifically. Choosing it now avoids ending up with two different Redis clients in the codebase later.

`RedisService` sets `enableOfflineQueue: false` and `commandTimeout: 5000`. Found necessary by testing the fail-closed requirement (`backend-design.md` §11) directly: `ioredis`'s default (`enableOfflineQueue: true`) queues commands issued while disconnected and replays them on reconnect, instead of rejecting them — a request made during a Redis outage just hung until Redis came back, then silently succeeded late instead of failing. `enableOfflineQueue: false` makes a command reject immediately when there's no connection; `commandTimeout` bounds how long an in-flight command waits when the connection is technically up but unresponsive.

## 6. Where this lives in code

The lock wraps the existing conditional Postgres update **inside** `EventsApi.reserveSeats(eventId, seatIds)` — signature unchanged from before this feature, since the lock's TTL is an internal `events`-module implementation detail (how long one request attempt is allowed to take before Redis force-clears a crashed attempt), not a business value `orders` needs to supply. Acquire all locks at once (§3); on failure, throw the same conflict as today without touching Postgres; on success, run the existing conditional `updateMany` inside a `try/finally` that always releases the locks afterward, regardless of outcome. `OrdersService` and the public `EventsApi` interface are unchanged — this is purely internal to `events`.

Two separate concerns, two different levels of reuse:

- **Redis connection**: one shared provider at the app level (a `RedisModule`, analogous to the existing shared `PrismaService`/connection pool reused across the `auth`/`events`/`orders` schemas) — needed again for Phase 2 rate limiting and Phase 3 BullMQ, so it shouldn't be reinvented per module.
- **Lock logic** (key format, the Lua compare-and-delete release script): internal to the `events` module, not a generic reusable `DistributedLockService` — there's only one consumer today (seat holds); a general abstraction is premature until a second, genuinely different use case exists to validate its shape.

## 7. Rate limiting on the reservation endpoint

`@nestjs/throttler` — the standard NestJS rate-limiting module (`Guard` + `@Throttle()` decorator). Its default storage is in-process memory, which has the same problem the seat lock would have had: with multiple backend instances, each instance counts independently, so the real per-user limit silently multiplies by instance count. Storage is backed by Redis instead, via `@nest-lab/throttler-storage-redis` (the actively maintained successor to the earlier standalone `nestjs-throttler-storage-redis` package) — it already implements atomic increment-check-block as a single Lua script against `ioredis`, the same client we already use, so there's nothing to hand-roll here.

Tracked **per `userId`**, not per IP — `POST /orders` already requires a valid JWT (`JwtAuthGuard`), so the real threat is one account hammering the endpoint, not one IP. `@nestjs/throttler`'s default tracker is IP-based, but `getTracker` is a plain option on `ThrottlerModule`'s config (confirmed by reading the package's own type definitions before implementing) — no custom `Guard` subclass needed, just `getTracker: (req) => req.user.sub` passed straight into `ThrottlerModule.forRootAsync()`.

Limit: 10 reservation attempts per 60 seconds per user — loose enough not to punish a normal user retrying after a 409 (seat taken), tight enough to stop a scripted burst against a single account.

## Not in this doc yet

- Response caching (`backend-design.md` §11, cache-aside for `GET /events`/`GET /events/:id`) — separate concern, not part of seat-hold locking or rate limiting.
