# Step 3 Implementation Plan — Orders/Booking

## Status

Not started. Breaks `project-plan.md` §8, Step 3 into concrete, ordered tasks, citing the module/interface names already locked in `backend-design.md`/`system-design.md`/`frontend-design.md` — same approach as `step-1-auth-plan.md`/`step-2-events-plan.md`. Depends on Step 1 (Auth) and Step 2 (Events/Catalog) being done, since booking requires a logged-in user and seats that already exist.

## Part A — Prisma: `orders` schema

- [x] Model the `orders` schema: `Order` (id, user_id, event_id, status, reserved_until, created_at), `OrderItem` (id, order_id → `Order`, seat_id, price) — per `backend-design.md` §7. Added one model at a time, not both in one go.
- [x] `OrderStatus` enum scoped to what Phase 1 actually reaches: `draft`, `reserved`, `cancelled` — not the full `system-design.md` §5 lifecycle (`paid`/`issued` are added as a Phase 4 schema extension, once the payment saga exists). Decided 2026-10-13.
- [x] No unique constraint on `OrderItem.seat_id`. Double-booking is prevented at the `Seat.status` layer instead (Part B) — a plain unique constraint would permanently block a seat from ever being reserved again after one cancelled order, since `OrderItem` rows are kept for history, never deleted. `backend-design.md` §2 updated 2026-10-13 to match (it previously described the unique constraint as a second line of defense).
- [x] Indexes: `orders.user_id`, `order_items.order_id` (`backend-design.md` §7 / `system-design.md` § Database performance). No index on `order_items.seat_id` — caught during review that nothing actually queries `OrderItem` by seat; that index was a leftover from the earlier unique-constraint plan.
- [x] Migration via `prisma migrate dev`. First use of a third Prisma schema (`orders`) alongside `auth`/`events` — no new `PrismaModule`/`PrismaService`, reuses the one from Step 1.

## Part B — Backend `orders` module (core booking flow)

- [x] Scaffold `OrdersModule` — `internal/` only, **no** `public/` contract. Corrected 2026-10-13: unlike `auth`/`events`, `backend-design.md`'s `orders` section never lists a "Public interface (sketch)" - nothing outside this module consumes Orders in Phase 1, so there's nothing to expose yet.
- [x] `EventsApi.reserveSeats(eventId, seatIds)` implemented for real. Inside `events`' own Prisma transaction: a conditional `seat.updateMany({ where: { id: { in: seatIds }, status: 'available' }, data: { status: 'held' } })`. A single `UPDATE ... WHERE` is atomic per-row in Postgres, so if the affected count is less than `seatIds.length`, some seat was already taken — the whole update rolls back and the call throws a conflict. Decided 2026-10-13: no `SELECT ... FOR UPDATE`, no Redis lock yet (that's Phase 2).
- [x] `POST /orders` — body `{ eventId, seatIds }` (`backend-design.md` §5). Sequence, decided 2026-10-13 as separate steps with compensation, not one cross-module DB transaction (keeps the module boundary real, foreshadows the Phase 4 saga):
  1. `OrdersService` creates `Order(draft)` + one `OrderItem` per seat (price copied from the seat's current price via `EventsApi`) inside its own transaction.
  2. Calls `EventsApi.reserveSeats(eventId, seatIds)`.
  3. On success: updates the order to `reserved` with `reservedUntil = now + 5 minutes` (hold TTL decided 2026-10-13).
  4. On failure (seat conflict): updates the just-created order to `cancelled` as a compensating action, returns 409.
- [x] `GET /orders` — the caller's own orders; `userId` from the JWT, never a request parameter (A01, `system-design.md` §8).
- [x] `GET /orders/:id` — ownership-checked, 404 (not 403) on mismatch — same convention as `events`.
- [x] `PATCH /orders/:id/cancel` — ownership-checked, only valid from `reserved` (an order is never externally visible in `draft` — by the time `POST /orders` responds it's already `reserved` or `cancelled`, so `409` here really only fires on an already-`cancelled` order). Releases the held seats back to `available` via a new `EventsApi.releaseSeats(seatIds)` (plain status flip, no conditional check needed - nothing contests releasing a seat), moves the order to `cancelled`. Shared with hold-expiry (Part C) rather than duplicated.
- [x] Emits `order.created` via `EventEmitterModule` after a successful reservation. Nobody listens yet (Phase 3's `notifications` module is the planned future consumer) - the payload already carries everything a future listener would need (`orderId`, `userId`, `eventId`, `seatIds`).
- [x] Verified end-to-end via curl: reservation, conflict + compensation, ownership checks (404 for a stranger), cancel + re-cancel 409.

## Part C — Hold expiry cron

- [x] `@nestjs/schedule` cron, every 1 minute (decided 2026-10-13): finds orders where `status = 'reserved' AND reserved_until < now()`. For each: releases the held seats via `EventsApi.releaseSeats()` (same shared logic as manual cancel), moves the order to `cancelled`, emits `order.reservation_expired`.
- [x] Verified end-to-end with a temporarily shortened hold (10s instead of 5min, reverted after the test): confirmed the seat flips back to `available` and the order to `cancelled` within one cron tick.

## Part D — `catalog` remote: reservation UI

Preceded by a backend-only prerequisite, decided 2026-10-14: denormalize `seatLabel` onto `OrderItem` and `eventTitle`/`eventStartsAt` onto `Order`, captured once in `createOrder()` from data already fetched via `EventsApi` - same pattern already used for `OrderItem.price`. `OrderPage` (below) needs this data and would otherwise have to call `EventsApi`/extra endpoints on every read; snapshotting at creation time means `GET /orders/:id` stays a single query, matching `backend-design.md` §3's "no cross-module JOINs... stores a denormalized copy at order-creation time" guidance. Requires a small migration (two new columns + one) and updates to `OrderDto`/`OrderItemDto`.

- [x] Schema: `Order.eventTitle` (String), `Order.eventStartsAt` (DateTime), `OrderItem.seatLabel` (String). Migration, then update `OrdersRepository.create()` to accept and store these alongside the existing `price`, and `OrderDto`/`OrderItemDto` to expose them.
- [x] `ReservationPanel` / `ReserveButton` (`frontend-design.md` §2) — holds the current seat selection in plain `useState` (`frontend-design.md` §7, never crosses the `shell`↔`catalog` boundary). Rendered as a sticky bar fixed to the bottom of the viewport on `EventDetailsPage`, always visible (not just after a first selection) - decided 2026-10-14. Shows selected-seat count + total price (e.g. "3 seats selected · $150"), not a full per-seat label list (would wrap awkwardly for a large selection). The "Reserve" button is disabled when zero seats are selected, rather than hiding the whole panel - avoids the panel's appearance shifting the page layout the moment the first seat is picked.
- [x] Submits `POST /orders`. On success, navigates to `/orders/:orderId` instead of showing a confirmation inline on `EventDetailsPage` (decided 2026-10-13).
- [x] Optimistic UI on the reserve click (`frontend-design.md` §9): mark the selected seats as `held` in the seat-map query's cache immediately via `setQueryData`, roll back on error. On a `409` specifically (decided 2026-10-14): show a toast ("Some of your selected seats are no longer available") and refetch the seat-availability query so the map reflects reality; the now-taken seat(s) are removed from `selectedSeatIds`.
- [x] `sonner` added to `@ticketing/ui` (decided 2026-10-14) - no toast primitive exists there yet; ported the same way `Card`/`Select`/`Badge` were.
- [x] New route `/orders/:orderId` in `CatalogRouter`, rendering `OrderPage` (`frontend-design.md` §2) - fetches `GET /orders/:id` (now self-contained thanks to the denormalization above: event title/date, each seat's label, and total price all come from the one response). Decided 2026-10-14, `OrderPage` shows:
  - Event title/date and the list of reserved seats with their prices.
  - A hold countdown (mm:ss) counting down to `reservedUntil`, positioned `fixed`/`absolute` per the CLS guidance (`frontend-design.md` §9). When it reaches `00:00`, refetches `GET /orders/:id` (React Query refetch) rather than just freezing at zero - picks up whatever the cron actually did, since the cron's own 1-minute tick means the hold may already be gone, or may need up to another minute to clear.
  - A "Cancel" action (confirmed via `AlertDialog`) calling `PATCH /orders/:id/cancel`.
- [ ] The WebSocket broadcast already fires from inside `EventsApi.reserveSeats()`, implemented for real in Part B — Step 2 Part C's gateway/room mechanics are already verified in isolation; this is just the first real caller exercising them end-to-end.

## Not in this step

- Redis-based distributed lock replacing the conditional-`UPDATE` mechanism in Part B, and rate limiting on the reservation endpoint — Phase 2 (`project-plan.md` §5).
- `Payment`, `Ticket` issuance, the `paid`/`issued` order states — Phase 4, once the payment saga exists (`backend-design.md` §2).
