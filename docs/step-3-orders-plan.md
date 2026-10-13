# Step 3 Implementation Plan — Orders/Booking

## Status

Not started. Breaks `project-plan.md` §8, Step 3 into concrete, ordered tasks, citing the module/interface names already locked in `backend-design.md`/`system-design.md`/`frontend-design.md` — same approach as `step-1-auth-plan.md`/`step-2-events-plan.md`. Depends on Step 1 (Auth) and Step 2 (Events/Catalog) being done, since booking requires a logged-in user and seats that already exist.

## Part A — Prisma: `orders` schema

- [ ] Model the `orders` schema: `Order` (id, user_id, event_id, status, reserved_until, created_at), `OrderItem` (id, order_id → `Order`, seat_id, price) — per `backend-design.md` §7. Add one model at a time, not both in one go.
- [ ] `OrderStatus` enum scoped to what Phase 1 actually reaches: `draft`, `reserved`, `cancelled` — not the full `system-design.md` §5 lifecycle (`paid`/`issued` are added as a Phase 4 schema extension, once the payment saga exists). Decided 2026-10-13.
- [ ] No unique constraint on `OrderItem.seat_id`. Double-booking is prevented at the `Seat.status` layer instead (Part B) — a plain unique constraint would permanently block a seat from ever being reserved again after one cancelled order, since `OrderItem` rows are kept for history, never deleted. `backend-design.md` §2 updated 2026-10-13 to match (it previously described the unique constraint as a second line of defense).
- [ ] Indexes: `orders.user_id`, `order_items.order_id`, `order_items.seat_id` (`backend-design.md` §7 / `system-design.md` § Database performance).
- [ ] Migration via `prisma migrate dev`. First use of a third Prisma schema (`orders`) alongside `auth`/`events` — no new `PrismaModule`/`PrismaService`, reuses the one from Step 1.

## Part B — Backend `orders` module (core booking flow)

- [ ] Scaffold `OrdersModule` with the `public/`/`internal/` folder seam (`backend-design.md` §3), same pattern as `auth`/`events` — kept consistent even though nothing outside this module consumes it yet in Phase 1.
- [ ] `EventsApi.reserveSeats(eventId, seatIds)` implemented for real (currently a stub that throws `'Not implemented'`). Inside `events`' own Prisma transaction: a conditional `seat.updateMany({ where: { id: { in: seatIds }, status: 'available' }, data: { status: 'held' } })`. A single `UPDATE ... WHERE` is atomic per-row in Postgres, so if the affected count is less than `seatIds.length`, some seat was already taken — the whole update rolls back and the call throws a conflict. Decided 2026-10-13: no `SELECT ... FOR UPDATE`, no Redis lock yet (that's Phase 2).
- [ ] `POST /orders` — body `{ eventId, seatIds }` (`backend-design.md` §5). Sequence, decided 2026-10-13 as separate steps with compensation, not one cross-module DB transaction (keeps the module boundary real, foreshadows the Phase 4 saga):
  1. `OrdersService` creates `Order(draft)` + one `OrderItem` per seat (price copied from the seat's current price via `EventsApi`) inside its own transaction.
  2. Calls `EventsApi.reserveSeats(eventId, seatIds)`.
  3. On success: updates the order to `reserved` with `reservedUntil = now + 5 minutes` (hold TTL decided 2026-10-13).
  4. On failure (seat conflict): updates the just-created order to `cancelled` as a compensating action, returns 409.
- [ ] `GET /orders` — the caller's own orders; `userId` from the JWT, never a request parameter (A01, `system-design.md` §8).
- [ ] `GET /orders/:id` — ownership-checked, 404 (not 403) on mismatch — same convention as `events`.
- [ ] `PATCH /orders/:id/cancel` — ownership-checked, only valid from `reserved` (an order is never externally visible in `draft` — by the time `POST /orders` responds it's already `reserved` or `cancelled`). Releases the held seats back to `available` via `EventsApi`, moves the order to `cancelled`. Shares the "release seat" logic with hold-expiry (Part C) rather than duplicating it.
- [ ] Emits `order.created`, `order.reservation_expired` via `EventEmitterModule` (`backend-design.md` §2/§4).

## Part C — Hold expiry cron

- [ ] `@nestjs/schedule` cron, every 1 minute (decided 2026-10-13): finds orders where `status = 'reserved' AND reserved_until < now()`. For each: releases the held seats via `EventsApi` (same shared logic as manual cancel), moves the order to `cancelled`, emits `order.reservation_expired` (`backend-design.md` §2).

## Part D — `catalog` remote: reservation UI

- [ ] `ReservationPanel` / `ReserveButton` (`frontend-design.md` §2) — holds the current seat selection in plain `useState` (`frontend-design.md` §7, never crosses the `shell`↔`catalog` boundary), submits `POST /orders`.
- [ ] Optimistic UI on the reserve click (`frontend-design.md` §9): mark the selected seats as `held` in the seat-map query's cache immediately via `setQueryData`, roll back on a 409/error response from the mutation.
- [ ] Hold countdown, driven by the `reservedUntil` the backend returns (`system-design.md` §7); positioned `fixed`/`absolute` per the CLS guidance (`frontend-design.md` §9).
- [ ] The WebSocket broadcast already fires from inside `EventsApi.reserveSeats()` once Part B implements it for real — Step 2 Part C's gateway/room mechanics are already verified in isolation; this is just the first real caller exercising them end-to-end.

## Not in this step

- Redis-based distributed lock replacing the conditional-`UPDATE` mechanism in Part B, and rate limiting on the reservation endpoint — Phase 2 (`project-plan.md` §5).
- `Payment`, `Ticket` issuance, the `paid`/`issued` order states — Phase 4, once the payment saga exists (`backend-design.md` §2).
