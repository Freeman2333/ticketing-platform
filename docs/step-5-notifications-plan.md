# Step 5 Implementation Plan — `notifications` Extraction

## Status

Not started. Breaks `project-plan.md` §5 Phase 3 (first extraction only — BullMQ is a separate, later piece) into concrete, ordered tasks, citing the decisions locked in `extraction-design.md`. Depends on Step 3 (Orders) for the two domain events this consumes.

## Part A — Infra

- [ ] Resend account created (free tier, no card) and an API key issued — kept in `.env`/`.env.example` as `RESEND_API_KEY`, never committed as a real value. User signing up directly; placeholder already in `.env.example`.
- [x] `RABBITMQ_URL` added to `.env`/`.env.example` (`amqp://<user>:<password>@localhost:5672`, built from the already-running `docker-compose.yml` `rabbitmq` service's existing `RABBITMQ_USER`/`RABBITMQ_PASSWORD`).
- [x] `@nestjs/microservices` and `amqplib`/`amqp-connection-manager` added as dependencies to `backend` (producer side) and the new `notifications` app (consumer side).
- [ ] `resend` (official SDK) added to the new `notifications` app.

## Part B — New `packages/notifications` Nx app

- [x] Scaffold a new Nx Node application, `notifications`, with its own `package.json`/`main.ts` — a real separate deployable, not a module inside `backend` (`extraction-design.md` §3). Required a webpack fix not anticipated in this plan: `@nestjs/microservices` internally `require()`s every transport SDK it supports (mqtt, kafkajs, @grpc/grpc-js, @nats-io/transport-node), none of which are installed since only RMQ is used; webpack's static analysis fails on them. Fixed via `webpack.IgnorePlugin` (the documented NestJS pattern for this) in `notifications/webpack.config.js` — `externals` doesn't work here since it matches already-resolved paths, and the failure happens during resolution itself.
- [x] `main.ts`: `NestFactory.createMicroservice()`, `Transport.RMQ`, `queue: 'notifications_queue'`, `queueOptions: { durable: true }`, `noAck: false` (`extraction-design.md` §6) — connects using `RABBITMQ_URL`.
- [ ] `NotificationsModule` with handlers for both events (`extraction-design.md` §5):
  - `@EventPattern('order.created')` — sends a real booking-confirmation email via Resend; the send is wrapped in `try/catch` (`extraction-design.md` §1) so a sandbox-mode rejection is logged, distinguished from other failures, but doesn't throw. `channel.ack(originalMsg)` (from `RmqContext`) is called after the handler completes either way — the event was handled correctly regardless of whether real delivery succeeded.
  - `@EventPattern('order.reservation_expired')` — same shape, a hold-expired notice.

## Part C — Producer side in `backend`

- [ ] `ClientsModule.register([{ name: 'NOTIFICATIONS_SERVICE', transport: Transport.RMQ, options: { urls: [RABBITMQ_URL], queue: 'notifications_queue', queueOptions: { durable: true } } }])` registered where `OrdersModule`/the cron live.
- [ ] `OrdersService.createOrder()` and `HoldExpiryCron.releaseExpiredHolds()`: replace `this.eventEmitter.emit('order.created'/'order.reservation_expired', ...)` with `this.notificationsClient.emit('order.created'/'order.reservation_expired', ...)` using a `ClientProxy`, same payload shapes as today (`OrderCreatedEvent`/`OrderReservationExpiredEvent`).
- [ ] `EventEmitterModule` and `@nestjs/event-emitter` removed from `AppModule` and `package.json` — confirmed unused anywhere else (`extraction-design.md` §4).

## Part D — Verification

- [ ] Both services running (`backend`, `notifications`) plus RabbitMQ: create a reservation using the email address the Resend account itself is registered with, confirm `notifications` logs receipt and a real email actually arrives in that inbox.
- [ ] Create a reservation with a *different* test user's email and confirm the sandbox-restriction rejection is logged clearly, without crashing the consumer or leaving the message unacknowledged.
- [ ] Same hold-expiry path check (shortened TTL for the test, as done in Step 3's own cron verification).
- [ ] Confirm the manual-ack wiring actually matters: inspect RabbitMQ's management UI (or deliberately slow the handler) to see a message sit as "unacked" while `notifications` is mid-processing, rather than being marked delivered the instant it's received.

## Not in this step

- BullMQ for queued email/push work (`project-plan.md` §5, `extraction-design.md`'s "Not in this doc yet") — separate, later piece of Phase 3.
- A verified custom domain for Resend (would lift the sandbox recipient restriction) — not needed for this learning project.
