# Payments Design — Phase 4 (Saga + Payments)

## 1. Scope

Phase 4 per `project-plan.md` §5: booking → payment → ticket-issuance, with Stripe (test mode) as the payment provider. Builds on the `reserved` state Phase 1 already produces; adds `paid` and `issued` to `OrderStatus` (`system-design.md` §5, `step-3-orders-plan.md`).

This also unblocks the `notifications` extraction paused in `step-5-notifications-plan.md` — `order.paid` becomes the real trigger for a booking-confirmation email, replacing the `order.created`/`order.reservation_expired` triggers that were removed for lacking a genuine "purchase completed" moment.

## 2. Payment flow: Stripe Checkout

Stripe Checkout (hosted page), not Stripe Elements or a simulated in-house "pay" endpoint — closest to how this is done in production without a PCI-scoped UI, and the only option of the three that exercises real webhook/signature/idempotency handling (the actual learning goal of this phase).

Flow:

1. Attendee, viewing their `reserved` order, triggers `POST /payments/checkout-session` (`{ orderId }`).
2. `PaymentsService` verifies the order is `reserved` and owned by the caller (via `OrdersApi`), creates a `Payment` row (`pending`), calls Stripe's `checkout.sessions.create()`, returns `{ url }`.
3. Frontend redirects the browser to that `url`.
4. Attendee pays with a Stripe test card on Stripe's own page.
5. Stripe redirects the browser back to `success_url`/`cancel_url`, and — independently — sends a `checkout.session.completed` webhook to `POST /payments/webhook`.
6. The webhook handler is the only thing that moves `Payment`/`Order` state (see §4) — the browser redirect is not trusted as proof of payment, since it can be lost (closed tab, dropped request) independently of whether Stripe actually charged the card.

## 3. Module boundary: a separate `payments` module

A new top-level module (`payments.payments` Postgres schema, `PaymentsApi`/`PAYMENTS_API` DI interface), not folded into `orders`. Matches the existing `auth`/`events`/`orders` convention of one module per business concept with strict seams (`backend-design.md` §2, §12) — payments is a distinct responsibility (money, an external provider, webhooks, retries) from booking (seat holds), and keeping the seam clean now is what made every previous extraction (`notifications`) mechanical rather than a rewrite.

## 4. Idempotent webhook handling

Stripe redelivers webhooks (this is expected behavior, not a bug on either side), so the handler must tolerate receiving the same `checkout.session.completed` event more than once without double-effecting anything (double-marking `paid`, double-emitting the outbox event).

Mechanism: before acting on a webhook, check the matched `Payment`'s current status. If it's already `succeeded`, log and return — no further writes, no outbox row. The existing `Payment.status` column is the idempotency anchor; no separate "processed event ids" table is needed for this.

Signature verification (`backend-design.md` §7): every webhook is verified against Stripe's signing secret before being trusted, rejecting anything that fails verification before it reaches business logic.

## 5. Reliable event publishing: a real polling outbox

Problem: the webhook handler needs to both (a) persist `Payment.succeeded`/`Order.paid` in Postgres and (b) publish an `order.paid` event for the ticket-issuance step (§6) to consume. Done as two independent calls, a crash between them leaves the order `paid` in the database with the event never sent — a silent lost update.

Researched 2026-10-21: production systems solve this one of two ways — a polling publisher (a background worker periodically reads unpublished rows from an `outbox_events` table and publishes them) or CDC (a tool like Debezium tails Postgres's write-ahead log directly and publishes on commit, near-instant but requires Kafka Connect infrastructure). Both give only at-least-once delivery, not exactly-once, so this is not an alternative to idempotent consumers (§4) — it's a complementary guarantee that the event is sent at all.

Decision: a real polling outbox (not simulated, not skipped), since CDC requires Kafka — not something this project runs (RabbitMQ is the broker here).

- `payments.outbox_events` table: `id`, `event_type`, `payload` (JSON), `created_at`, `published_at` (nullable — `null` means not yet published).
- The webhook handler writes the `Payment`/`Order` update and the matching `outbox_events` row in one Postgres transaction — both succeed or both roll back together.
- A separate background worker (NestJS `@Interval`, polling every few seconds) selects unpublished rows, publishes each to RabbitMQ, then sets `published_at`. An index on `published_at` (partial, `WHERE published_at IS NULL`) keeps the poll query cheap as the table grows; old published rows are pruned periodically rather than kept forever.

## 6. Ticket issuance as a separate saga step

`paid → issued` is not done inside the webhook transaction, nor inside `orders`' `payment.succeeded` handler. The webhook only gets the order to `paid` and writes to `orders.outbox_events`; a separate consumer, in the same `backend` process, reacts to its own `order.paid` message and creates a `Ticket` per `OrderItem`, then moves the order to `issued`.

This is what makes "saga" in `backend-design.md` §12 an actual implemented thing rather than a label: a chain of independently-retriable steps, each with its own idempotency, rather than one big transaction. It also keeps the Stripe webhook handler fast — Stripe expects a quick response and retries if it doesn't get one, so pushing potentially heavier work (ticket/QR generation) out of that handler is the correct shape, not just a stylistic choice.

**Module ownership: `orders`, not `payments`.** `Ticket` was originally added to the `payments` Postgres schema (Part A, before this was designed in detail). Decided 2026-10-23 to move it to the `orders` schema instead: `Ticket.orderItemId` and `Order.status = 'issued'` are both `orders`-owned already, and having `payments` write to `Order.status` would reintroduce the exact cross-module-write problem that forced the `payments` → `orders` split in the first place (§5) — it would just move the violation to the other module instead of removing it.

**No new queue.** Since the consumer lives in `orders`, it reuses the existing `orders_queue` and the existing hybrid-app listener (`main.ts`, `backend-design.md`'s saga-controller pattern) — publishing `order.paid` to the same queue `payment.succeeded` already flows through. `@nestjs/microservices` routes locally by event-pattern name, not by queue, so multiple event types share one queue without conflict.

**QR code**: generated server-side (the `qrcode` npm package), encoding just `Ticket.id` (a UUID v4 — unguessable enough for this project's threat model; no separate signed token). The generated image is uploaded to Cloudflare R2 using the same `S3Client` shape `PosterStorageService` already uses, with `ContentDisposition: attachment` set on upload so the frontend's download link works despite the image being cross-origin (browsers ignore the HTML `download` attribute on cross-origin resources unless the server sends that header). `Ticket.qrCodeRef` stores the resulting R2 URL.

**API surface**: no new endpoint. `OrderDto` (`GET /orders/:id`) gains a `tickets` field (`{ id, seatLabel, qrCodeUrl }[]`), populated once `order.status === 'issued'`.

**Frontend**: `OrderPage`'s existing "awaiting payment" polling (added for the Stripe-redirect wait) extends through this step too — once `status === 'paid'` but `tickets` is still empty, keep polling with a "generating your tickets" message; render one ticket card (seat label + QR image, download button TBD) per entry once `tickets` is populated. No separate "My Tickets" page — researched 2026-10-23: real ticketing platforms (GuestManager, CM.com, AudienceView) treat the order/confirmation page itself as the persistent ticket view, which `OrderPage` already is (reachable again later via the orders list), rather than a separate destination.

## Not in this doc yet

- Payment failure/decline handling beyond what `system-design.md` §7 already states (order stays `reserved`, attendee can retry, producing another `Payment` row).
- Compensation for a failed ticket-issuance step specifically (e.g. retried via the same at-least-once redelivery the outbox already provides, or something more) — to be decided when that step is built.
- The ticket download button's exact interaction — deferred, revisit once the rest of the step is implemented.
