# Step 6 Implementation Plan — Payments (Phase 4)

## Status

Not started. Breaks `project-plan.md` §5 Phase 4 into concrete, ordered tasks per the decisions locked in `payments-design.md`. Depends on Step 3 (Orders) for the `reserved` state this builds on.

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
- [ ] Idempotency check: if the matched `Payment.status` is already `succeeded`, log and return — no further writes (`payments-design.md` §4).
- [ ] On a fresh `checkout.session.completed`: in one Postgres transaction, mark `Payment.succeeded`, move `Order` to `paid`, and insert the matching `outbox_events` row (`payments-design.md` §5).

## Part E — Outbox worker

- [ ] `OutboxPublisherService` (NestJS `@Interval`, every few seconds): select unpublished rows, publish each to RabbitMQ, set `publishedAt`.
- [ ] Confirm the partial index is actually used by the poll query (not a full table scan) once there's more than a handful of rows.

## Part F — Ticket issuance (saga step 2)

- [ ] A consumer in `backend` subscribing to its own `order.paid` message off RabbitMQ (same mechanism as `notifications`, just consumed by `backend` itself) — not inside the webhook handler (`payments-design.md` §6).
- [ ] Creates one `Ticket` per `OrderItem`, moves `Order` to `issued`.
- [ ] Idempotent the same way as §4: if the order is already `issued`, no-op.

## Part G — Verification

- [ ] Full happy path: reserve → checkout → pay with a Stripe test card → webhook received → `Payment.succeeded` → `Order.paid` → outbox row published → `order.paid` consumed → `Ticket`s created → `Order.issued`.
- [ ] Duplicate webhook delivery (Stripe CLI can resend an event) confirmed idempotent — no double ticket issuance, no second outbox row.
- [ ] Declined test card: order stays `reserved`, a new `Payment` row is created on retry (`system-design.md` §7, already decided).
- [ ] Outbox durability: confirm a row written in the webhook's transaction is visible and gets published even if the webhook handler's process restarts before the worker's next poll (i.e. the row survived in Postgres, not lost in memory).

## Not in this step

- QR code generation for `Ticket.qrCodeRef` — `payments-design.md` "Not in this doc yet", decided when this step is actually touched.
- Re-wiring `notifications` to a real trigger (`order.paid`) — `step-5-notifications-plan.md`'s paused Part C/D become doable once this step's `order.paid` event exists, but are tracked in that doc, not duplicated here.
- Compensation for a failed ticket-issuance step beyond the at-least-once redelivery the outbox already provides — `payments-design.md` "Not in this doc yet".
