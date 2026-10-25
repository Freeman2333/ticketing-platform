# Step 5 Implementation Plan — `notifications` Extraction

## Status

In progress. Breaks `project-plan.md` §5 Phase 3 (first extraction only — BullMQ is a separate, later piece) into concrete, ordered tasks, citing the decisions locked in `extraction-design.md`. Parts A/B done; Part C (producer side, trigger = `Order.issued`) and Part D (verification) unpaused 2026-10-25 now that Phase 4 (payments) is done.

## Part A — Infra

- [x] Resend account created (free tier, no card) and an API key issued — kept in `.env` as `RESEND_API_KEY` (real value, not committed; `.env.example` keeps the `change-me` placeholder).
- [x] `RABBITMQ_URL` added to `.env`/`.env.example` (`amqp://<user>:<password>@localhost:5672`, built from the already-running `docker-compose.yml` `rabbitmq` service's existing `RABBITMQ_USER`/`RABBITMQ_PASSWORD`).
- [x] `@nestjs/microservices` and `amqplib`/`amqp-connection-manager` added as dependencies to `backend` (producer side) and the new `notifications` app (consumer side). Pinned to `^11.2.7` in both — `^12.2.0` (the version `npm` first resolved) is a major version ahead of `@nestjs/common`/`@nestjs/core` (`^11.0.0`) used everywhere else and crashes at runtime (`Cannot find module '@nestjs/common/internal'`), an internal export that only exists in `@nestjs/common` v12.
- [x] `resend` (official SDK) added to the new `notifications` app.

## Part B — New `packages/notifications` Nx app

- [x] Scaffold a new Nx Node application, `notifications`, with its own `package.json`/`main.ts` — a real separate deployable, not a module inside `backend` (`extraction-design.md` §3). Required a webpack fix not anticipated in this plan: `@nestjs/microservices` internally `require()`s every transport SDK it supports (mqtt, kafkajs, @grpc/grpc-js, @nats-io/transport-node), none of which are installed since only RMQ is used; webpack's static analysis fails on them. Fixed via `webpack.IgnorePlugin` (the documented NestJS pattern for this) in `notifications/webpack.config.js` — `externals` doesn't work here since it matches already-resolved paths, and the failure happens during resolution itself.
- [x] `main.ts`: `NestFactory.createMicroservice()`, `Transport.RMQ`, `queue: 'notifications_queue'`, `queueOptions: { durable: true }`, `noAck: false` (`extraction-design.md` §6) — connects using `RABBITMQ_URL`.
- [x] `NotificationsController` with handlers for `order.created`/`order.reservation_expired` was written and verified end-to-end (Resend send in `try/catch`, manual `channel.ack(originalMsg)` via `RmqContext` — `extraction-design.md` §1/§6) by publishing a hand-crafted `{ pattern: 'order.created', data: {...} }` message directly onto `notifications_queue`; a real email arrived at the registered Resend account address.
- [ ] Removed again (2026-10-21) along with the handlers, once Part C below made it clear *why* these two events specifically shouldn't trigger an email yet. `AppModule` is currently empty (`controllers: []`) — `main.ts`'s `createMicroservice()` still boots and connects to `notifications_queue`, it just has nothing registered to handle messages. Rebuild this now that Phase 4 has a real `Order.issued` event to key off of (see Part C).

## Part C — Producer side in `backend`

Unpaused 2026-10-25, now that Phase 4 (payments) is done and `Order.issued` exists with a real `ticketsPdfUrl` to attach (`payments-design.md` §1, "revised"). Trigger is `Order.issued`, not `order.paid` — see that doc for why.

**Reuses the existing `orders.outbox_events` table and its `OutboxPublisherService`** (`payments-design.md` §5), rather than a new mechanism — the transactional-outbox guarantee (no lost event if the process dies between the DB write and the publish) applies here exactly as it does for `order.paid`. Concretely:

- `OrdersService.issueTickets` writes a second outbox row, `event_type = 'order.issued'`, in the same transaction as `Order.issued` + `Order.ticketsPdfUrl` + the `Ticket` rows (`markIssuedAndCreateTickets` already does one atomic write for the first three — extend it to also insert this row).
- `OutboxPublisherService` currently sends every unpublished row to one place (`orders_queue`, self-consumed by `OrdersSagaController` for the ticket-issuance hop). It needs a second `ClientProxy` (a new `NOTIFICATIONS_QUEUE_CLIENT`, `queue: 'notifications_queue'`) and a small routing step: `order.paid` keeps going to `orders_queue` as before, `order.issued` goes to `notifications_queue` instead — the only consumer of `order.issued` is the separate `notifications` app, nothing inside `orders` itself reacts to it.

- [x] `ClientsModule` in `orders.module.ts` gains a second RMQ client registration, `NOTIFICATIONS_QUEUE_CLIENT` (`queue: 'notifications_queue'`), alongside the existing `ORDERS_QUEUE_CLIENT`.
- [x] `OrdersRepository.markIssuedAndCreateTickets` also inserts an `order.issued` outbox row — richer payload than originally sketched (`{ orderId }`), since `notifications` has no DB access (`extraction-design.md` §4): `{ orderId, email, eventTitle, eventStartsAt, seatLabels, ticketsPdfUrl }`. Required re-wiring `AuthApi` into `OrdersModule`/`OrdersService` (`getUserById`) to get the email — this had been removed along with the rest of Part C when it was originally paused.
- [x] `OutboxPublisherService.publishUnpublishedEvents` routes by `event.eventType`: `order.paid` → `ordersQueueClient`, `order.issued` → `notificationsQueueClient`.
- [x] `notifications` gets a real handler: `OrderIssuedController` (`@EventPattern('order.issued')`, manual ack via `RmqContext`) plus a `ResendService` wrapping the Resend client. The email is sent via `resend.emails.send` with the PDF as a proper attachment — `attachments: [{ filename, path: ticketsPdfUrl }]`, which has Resend fetch the file itself from the (public) R2/MinIO URL server-side, no manual download/base64 step needed. `from` is hardcoded to `onboarding@resend.dev`, Resend's sandbox-mode sender (no verified custom domain). A Resend failure is caught and logged, but the message is still acked — matching `extraction-design.md` §1's reasoning (a sandbox-restriction rejection won't be fixed by retrying, so retrying forever isn't the right response; the *event* was still handled correctly).
- [x] `EventEmitterModule`/`@nestjs/event-emitter` — already gone from `backend`'s code and `package.json`; nothing left to remove.

## Part D — Verification

- [x] `notifications` running standalone (no `backend` wiring yet): a hand-crafted `order.created` message published directly onto `notifications_queue` was received, logged, and a real email arrived at the Resend account's registered address.
- [ ] End-to-end from a real `backend` action: issue real tickets for a real order, confirm the email arrives with the PDF.
- [ ] Create a reservation with a *different* test user's email and confirm the sandbox-restriction rejection is logged clearly, without crashing the consumer or leaving the message unacknowledged.
- [ ] Confirm the manual-ack wiring actually matters: inspect RabbitMQ's management UI (or deliberately slow the handler) to see a message sit as "unacked" while `notifications` is mid-processing, rather than being marked delivered the instant it's received.

## Not in this step

- BullMQ for queued email/push work (`project-plan.md` §5, `extraction-design.md`'s "Not in this doc yet") — separate, later piece of Phase 3.
- A verified custom domain for Resend (would lift the sandbox recipient restriction) — not needed for this learning project.
