# Step 6 Implementation Plan — Payments (Phase 4)

## Status

In progress. Breaks `project-plan.md` §5 Phase 4 into concrete, ordered tasks per the decisions locked in `payments-design.md`. Depends on Step 3 (Orders) for the `reserved` state this builds on.

Parts A-D done; Part E (payments→orders outbox hop) done; Part E.5 (orders reacting to `payment.succeeded`, a saga hop not in the original design) done; frontend payment flow done, deployed, and verified end to end (`docs/deployment-plan.md`). Part F (ticket issuance, QR per seat) done and verified against real backlog data, then revised before shipping — see Part H (single PDF per order), done and verified end to end locally. Part G (remaining idempotency/durability tests) still open.

## Part A — Infra

- [x] Stripe account (test mode) — secret key obtained, kept in `.env` as `STRIPE_SECRET_KEY` (real value, not committed; `.env.example` keeps the `change-me` placeholder). Only the secret key is needed — this flow never touches Stripe.js/the publishable key on the frontend, since Checkout Sessions return a ready `url` to redirect to. `STRIPE_WEBHOOK_SECRET` placeholder added too, real value pending Part D (Stripe CLI).
- [x] `stripe` (official Node SDK, `^23.0.0`) added to `backend`.
- [x] Prisma: `OrderStatus` extended with `paid`, `issued` (`payments-design.md` §1).
- [x] Prisma: `Payment` model (`payments` schema) — `id`, `orderId` (opaque, no cross-schema FK per `backend-design.md` §8), `stripeSessionId` (unique), `amount`, `status` (`pending`/`succeeded`/`failed`), `createdAt`.
- [x] Prisma: `Ticket` model (`payments` schema) — `id`, `orderItemId` (unique — at most one ticket per seat), `issuedAt`, `qrCodeRef` (nullable; format decided later).
- [x] Prisma: `outbox_events` table (`payments` schema) — `id`, `eventType`, `payload` (JSON), `createdAt`, `publishedAt` (nullable). Index on `publishedAt` is a **plain** index, not the partial (`WHERE published_at IS NULL`) index `payments-design.md` §5 describes — Prisma's schema DSL has no partial-index syntax, and fixing it now would need a destructive `migrate reset` (wipes local data) since the migration's already applied. Deferred; revisit if query performance ever actually matters here.
- [x] Migration applied (`20261021123336_add_payments_and_tickets`).

## Part B — New `payments` module scaffolding

- [x] `payments.module.ts`, `PaymentsService`, `PaymentsRepository` — mirrors the existing `auth`/`events`/`orders` module shape. Also added `StripeService` (wraps the Stripe SDK client, same shape as `PosterStorageService` wrapping S3).
- [ ] `PaymentsApi`/`PAYMENTS_API` DI interface — skipped. No other module needs to call into `payments` yet (it's always the caller, never the callee), so a DI token with no consumer would be a speculative abstraction. Add it if Part F ends up needing one.
- [x] `OrdersApi` extended with `getOrder` (exposed via `orders/public/orders-api.interface.ts`, `ORDERS_API` wired into DI). Also moved `OrderDto`/`OrderItemDto` from `orders/internal/dto` to `orders/public/dto` to match the `events` module's convention.

## Part C — Checkout endpoint

- [x] `POST /payments/checkout-session` (`{ orderId }`): verify the order is `reserved` and owned by the caller, sum its items for the amount, call Stripe, **then** create the `Payment` row (`pending`) with the real `stripeSessionId` — reordered from this doc's original sketch (`Payment` first, then Stripe) since `stripeSessionId` is a required unique column; creating it after the Stripe call avoids a nullable-then-updated field.
- [x] `success_url`/`cancel_url` both point back to the order page (`FRONTEND_ORIGIN`/orders/:orderId) — no separate success/cancel pages built, the order page itself reflects whatever status ends up being true.

## Part D — Webhook endpoint

- [x] `POST /payments/webhook`: needs Stripe's **raw**, unparsed request body for signature verification. Used NestJS's built-in `rawBody: true` option (`NestFactory.create(AppModule, { rawBody: true })`) rather than disabling the global body parser — this makes `req.rawBody` available on every route alongside the normal parsed JSON, without touching any other route's behavior. The route itself is `@Public()` (bypasses the global JWT guard — Stripe has no JWT).
- [x] Verify the signature against `STRIPE_WEBHOOK_SECRET` before touching any business logic (`StripeService.constructWebhookEvent`). Verified end-to-end: installed the Stripe CLI (`winget install Stripe.StripeCli`), ran `stripe listen --forward-to localhost:3000/api/payments/webhook` to get a real local `STRIPE_WEBHOOK_SECRET`, then `stripe trigger checkout.session.completed` — backend logged the verified event type, confirming the signature check actually passes for a real Stripe-signed request.
- [x] Idempotency check: if the matched `Payment.status` is already `succeeded` (or no `Payment` matches), log and return — no further writes.
- [x] On a fresh `checkout.session.completed`: in one Postgres transaction (`PaymentsRepository.markSucceededAndCreateOutboxEvent`), mark `Payment.succeeded` and insert a `payment.succeeded` outbox row — **revised from this doc's original sketch**, which had the webhook directly call `OrdersApi.markPaid()` to move `Order` to `paid` in the same step. That would require passing a Prisma transaction client across the `orders`/`payments` module boundary through the public `OrdersApi` interface, leaking a Prisma-specific type across a seam meant to stay DI-only (`backend-design.md` §12). Instead, moving `Order` to `paid` became its own separate saga step — see the new Part E.5 below.

## Part E — Outbox worker (payments → orders hop)

- [x] `OutboxPublisherService` in `payments` (NestJS `@Interval(5000)`): selects unpublished `payments.outbox_events` rows, emits each to a new `ORDERS_SAGA_CLIENT` RabbitMQ client (queue `orders_queue`), **awaits confirmed delivery** (`firstValueFrom`, not a bare `.subscribe()`) before calling `markPublished` — so a publish failure leaves the row unpublished for retry rather than being marked done regardless.
- [ ] Confirm the partial index is actually used by the poll query (not a full table scan) once there's more than a handful of rows — still a plain index, same as Part A's note.

## Part E.5 — `orders` reacts to `payment.succeeded` (new saga hop, not in the original plan)

Added because the webhook can no longer call `OrdersApi.markPaid` directly (see Part D's revision note). Researched 2026-10-21: this is a real, documented production pattern (chained saga steps, each participant owning its own transactional outbox — `payments-design.md`'s `OutboxPublisherService` note now has a matching `orders`-side counterpart described here), not an invented complication.

- [x] `backend` now runs as a NestJS **hybrid application** (`main.ts`: `app.connectMicroservice()` + `app.startAllMicroservices()`, alongside the existing HTTP server in the same process) — listens on a second queue, `orders_queue`.
- [x] `OrdersSagaController` (`orders/internal/`), `@EventPattern('payment.succeeded')`: looks up the order, no-ops if it's not `reserved` (idempotent against redelivery), otherwise calls `OrdersRepository.markPaidAndCreateOutboxEvent` — same atomic shape as `payments`' webhook handler, but now writing to `orders.outbox_events` (a **second**, parallel outbox table, added via its own migration/Prisma model `OrdersOutboxEvent` since Prisma requires globally-unique model names even across schemas).
- [x] `markPaid` removed from the public `OrdersApi` interface again — nothing outside `orders` calls it; the new in-module consumer calls `OrdersRepository` directly.
- [ ] A second `OutboxPublisherService`-equivalent for `orders.outbox_events` (to actually publish `order.paid` somewhere) — **deliberately not built yet**. Discussed 2026-10-22: there's no consumer for `order.paid` until Part F (ticket issuance) exists, so a publisher with nothing on the other end is plumbing with no destination. `orders.outbox_events` rows sit unpublished (harmless) until Part F is picked up.

## Part F — Ticket issuance (saga step 3)

Design agreed 2026-10-23 (`payments-design.md` §6): `Ticket` moves from the `payments` schema to `orders`, issuance reuses the existing `orders_queue`/hybrid listener (no new queue), QR is generated server-side and uploaded to R2, `OrderDto` gains a `tickets` field, and the frontend extends its existing polling pattern.

### F.1 — Schema

- [x] Move `Ticket` from the `payments` schema to `orders` (`@@schema("orders")`) — one migration, `ALTER TABLE payments.tickets SET SCHEMA orders` (preserves the table rather than drop/recreate). Also added a real `@relation` to `OrderItem` (no longer cross-schema, so no reason to keep it opaque).

### F.2 — Publish `order.paid` (the missing piece from Part E.5)

- [x] Build the `orders`-side `OutboxPublisherService` equivalent: polls `orders.outbox_events` for unpublished rows, emits each to the same RabbitMQ connection the saga controller already listens on, awaits confirmed delivery before marking published — same shape as `payments`' `OutboxPublisherService` (Part E).

### F.3 — Issuance consumer

- [x] New controller in `orders/internal/`, `@EventPattern('order.paid')`: idempotency check (no-op if `order.status !== 'paid'`, i.e. already `issued` or not actually ready), generates one `Ticket` per `OrderItem`, moves `Order` to `issued`.
- [x] ~~QR generation: `qrcode` package, payload = `Ticket.id`. Upload to R2... `Ticket.qrCodeRef` = the resulting URL.~~ Implemented as a standalone PNG per seat, verified working end to end (10 backlogged orders, 19 tickets, real R2-equivalent URLs) — then **superseded by Part H below** before ever shipping to users, once the email requirement made a single combined PDF the better shape.

### F.4 — API

- [x] ~~`OrderDto` gains `tickets: { id, seatLabel, qrCodeUrl }[]`~~ — shipped, then superseded by Part H's `ticketsPdfUrl`.

### F.5 — Frontend

- [x] Extend `OrderPage`'s existing "awaiting payment" polling: once `status === 'paid'` but `tickets` is still empty, keep polling with a "generating your tickets" message. (Also fixed a latent bug while here: polling previously never stopped once `session_id` was in the URL, even after reaching a terminal state — now driven by the query's own data via a `refetchInterval` function, not just the URL flag.)
- [x] ~~Render one ticket card (seat label + QR image) per entry~~ — shipped (`TicketsList.tsx`), then superseded by Part H's single "View/Download tickets" button.

## Part H — Revise ticket delivery to a single PDF per order

Revised 2026-10-25 (`payments-design.md` §6, "QR code, revised"): once `notifications` re-enters the picture (§1 — `order.paid` is meant to trigger a real confirmation email), emailing a ticket needs a server-generated artifact regardless of what the web page shows — so F.3's per-seat PNGs plus a hypothetical client-side QR render would have been a third redundant implementation, not a simplification. One combined PDF per order (not per seat) serves the page, the download, and the future email attachment with a single generated file.

### H.1 — PDF generation

- [x] Add `pdfkit`. Pinned to `0.17.2`, not latest — `0.20.2`'s standard-font loading uses a dynamic Node "imports" subpath (`#standard-fonts/*`) that webpack can't bundle, breaking PDF generation at runtime (`Cannot find module '#standard-fonts/Helvetica'`). `0.17.2` uses plain `fs.readFileSync` font loading instead; its `.afm` font files are copied into `dist/data` via a `webpack.config.js` assets entry.
- [x] `TicketQrService` split: now just `generateBuffer(ticketId)` — no S3 client, no upload method, since there's no standalone PNG anymore.
- [x] New `TicketPdfService`: takes the order + each seat's QR buffer, draws one PDF (event title, date, per-seat label + QR, one page per seat), uploads to R2/MinIO (`tickets/<orderId>.pdf`, `ContentDisposition: attachment`).

### H.2 — Schema

- [x] Migration (`20261025082632_add_tickets_pdf_url`): added `Order.ticketsPdfUrl` (nullable), removed `Ticket.qrCodeRef`. Also required adding `prisma.config.ts` at the repo root — Prisma 7 moved datasource connection config out of `schema.prisma` into a separate config file, which this project didn't have yet.

### H.3 — Issuance consumer

- [x] `OrdersService.issueTickets`: generates each seat's `id` + QR buffer up front (QR must encode the id before the row exists), passes them all into one `TicketPdfService` call, then atomically writes `Order.issued` + `Order.ticketsPdfUrl` + `Ticket` rows (no `qrCodeRef`).

### H.4 — API

- [x] `OrderTicketDto` loses `qrCodeUrl` (now just `{ id, seatLabel }`); `OrderDto` gains `ticketsPdfUrl: string | null`.

### H.5 — Frontend

- [x] Replaced the QR grid with a single "View/Download tickets" button linking to `order.ticketsPdfUrl` (new tab, native PDF viewer). `PaidConfirmation.tsx` and `TicketsList.tsx` were later inlined into `OrderPage.tsx` and deleted — both had shrunk to single-purpose wrappers (icon+text, one button) with no reuse once the PNG grid was gone. The "View/Download tickets" and "Back to event" buttons sit in one row with explicit hierarchy (primary vs `outline`) instead of stacked equally-weighted buttons.

## Part G — Verification

- [x] Happy path up through `Order.paid`: reserved a real order, called `POST /payments/checkout-session`, paid with a Stripe test card (`4242 4242 4242 4242`) in a real browser, confirmed via `psql`: `Payment.status = succeeded`, `Order.status = paid`, `payments.outbox_events` row published (`published_at` set), `orders.outbox_events` row written with the correct `orderItemIds` (not yet published — see Part E.5).
- [x] Duplicate webhook delivery confirmed idempotent. `stripe events resend` needs a dashboard-registered webhook endpoint, which `stripe listen`-based local dev doesn't create, so re-delivered a real already-succeeded event manually: fetched its body via `stripe events retrieve`, re-signed it with `STRIPE_WEBHOOK_SECRET` (same HMAC scheme Stripe uses), POSTed it to `/api/payments/webhook`. Backend logged `"Webhook already processed or payment not found, skipping."`; `Payment` and `payments.outbox_events` row counts unchanged.
- [ ] ~~Declined test card: order stays `reserved`, a new `Payment` row is created on retry (`system-design.md` §7, already decided).~~ Skipped 2026-10-25 — needs real browser interaction with Stripe's hosted Checkout page, not worth the setup for this project.
- [x] Outbox durability confirmed. First attempt (send a signed webhook, then `taskkill` the process immediately) raced the 5s poll interval and lost — the row was already published before the kill landed, since there's real latency between the HTTP response returning and a separate `taskkill` command executing. Retested deterministically instead: with the backend process fully stopped, inserted an unpublished `payments.outbox_events` row directly via SQL (so no process could have touched it yet), then started a fresh backend process. It picked up and published the row on its first poll, and the downstream order correctly reached `issued` with a real `ticketsPdfUrl` — confirming the guarantee doesn't depend on which process wrote vs. publishes a row, only on DB state.
- [x] ~~Full chain through `Order.issued` — blocked on Part F.~~ Verified 2026-10-24 via the real backlog of 10 orders left `paid` from earlier payment testing: all picked up automatically on a backend restart (Part F.2's publisher + F.3's consumer), 19 tickets created, QR images confirmed reachable. Not a synthetic test — genuine leftover production-shaped data.

## Not in this step

- The ticket PDF's exact layout/styling — Part H.1 covers generating it, not its visual design in detail.
- Re-wiring `notifications` to a real trigger (`order.paid`) — `step-5-notifications-plan.md`'s paused Part C/D become doable once Part F's `order.paid` consumer exists, but are tracked in that doc, not duplicated here.
- Compensation for a failed ticket-issuance step beyond the at-least-once redelivery the outbox already provides — `payments-design.md` "Not in this doc yet".
- ~~**Frontend integration**~~ — done: `PayButton`/`PaidConfirmation` on `OrderPage`, `?session_id=` detection + polling for the webhook-processing window.
- ~~**`Seat.status` never reaches `booked`**~~ — found 2026-10-22, fixed same day. Added `EventsApi.markSeatsBooked(eventId, seatIds)` (mirrors `reserveSeats`/`releaseSeats`), called from `OrdersService.handlePaymentSucceeded` before the atomic `Order.paid` write (so a retry on redelivery can still re-run the seat update, which is an idempotent `updateMany`). Verified with a real Stripe test payment: both seats on the paid order show `status = booked` in `psql`.
