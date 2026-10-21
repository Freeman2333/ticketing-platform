# Step 5 Implementation Plan — `notifications` Extraction

## Status

Not started. Breaks `project-plan.md` §5 Phase 3 (first extraction only — BullMQ is a separate, later piece) into concrete, ordered tasks, citing the decisions locked in `extraction-design.md`. Depends on Step 3 (Orders) for the two domain events this consumes.

## Part A — Infra

- [x] Resend account created (free tier, no card) and an API key issued — kept in `.env` as `RESEND_API_KEY` (real value, not committed; `.env.example` keeps the `change-me` placeholder).
- [x] `RABBITMQ_URL` added to `.env`/`.env.example` (`amqp://<user>:<password>@localhost:5672`, built from the already-running `docker-compose.yml` `rabbitmq` service's existing `RABBITMQ_USER`/`RABBITMQ_PASSWORD`).
- [x] `@nestjs/microservices` and `amqplib`/`amqp-connection-manager` added as dependencies to `backend` (producer side) and the new `notifications` app (consumer side). Pinned to `^11.2.7` in both — `^12.2.0` (the version `npm` first resolved) is a major version ahead of `@nestjs/common`/`@nestjs/core` (`^11.0.0`) used everywhere else and crashes at runtime (`Cannot find module '@nestjs/common/internal'`), an internal export that only exists in `@nestjs/common` v12.
- [x] `resend` (official SDK) added to the new `notifications` app.

## Part B — New `packages/notifications` Nx app

- [x] Scaffold a new Nx Node application, `notifications`, with its own `package.json`/`main.ts` — a real separate deployable, not a module inside `backend` (`extraction-design.md` §3). Required a webpack fix not anticipated in this plan: `@nestjs/microservices` internally `require()`s every transport SDK it supports (mqtt, kafkajs, @grpc/grpc-js, @nats-io/transport-node), none of which are installed since only RMQ is used; webpack's static analysis fails on them. Fixed via `webpack.IgnorePlugin` (the documented NestJS pattern for this) in `notifications/webpack.config.js` — `externals` doesn't work here since it matches already-resolved paths, and the failure happens during resolution itself.
- [x] `main.ts`: `NestFactory.createMicroservice()`, `Transport.RMQ`, `queue: 'notifications_queue'`, `queueOptions: { durable: true }`, `noAck: false` (`extraction-design.md` §6) — connects using `RABBITMQ_URL`.
- [x] `NotificationsController` with handlers for `order.created`/`order.reservation_expired` was written and verified end-to-end (Resend send in `try/catch`, manual `channel.ack(originalMsg)` via `RmqContext` — `extraction-design.md` §1/§6) by publishing a hand-crafted `{ pattern: 'order.created', data: {...} }` message directly onto `notifications_queue`; a real email arrived at the registered Resend account address.
- [ ] Removed again (2026-10-21) along with the handlers, once Part C below made it clear *why* these two events specifically shouldn't trigger an email yet. `AppModule` is currently empty (`controllers: []`) — `main.ts`'s `createMicroservice()` still boots and connects to `notifications_queue`, it just has nothing registered to handle messages. Rebuild this once Phase 4 has a real `order.paid` (or similar) event to key off of.

## Part C — Producer side in `backend`

Paused — decided 2026-10-21. Reasoning: `OrderStatus` has no `paid` state yet (`step-3-orders-plan.md`, `backend-design.md` §2 — `paid`/`issued` are a Phase 4 schema extension, once the payment saga exists). Emailing a user about a `reserved`/`order.reservation_expired` order — a temporary hold, not a completed purchase — isn't worth doing before there's a real "payment succeeded" moment to hang a confirmation email on. `backend` was briefly wired to publish to RabbitMQ (`ClientsModule` + `ClientProxy.emit()` replacing `EventEmitter2.emit()` in both call sites) and reverted back to `EventEmitter2` (still a no-op — nothing listens) once this was noticed mid-implementation.

`notifications` (Part B) stays scaffolded — `main.ts` still boots a real microservice connected to `notifications_queue` — but the `order.created`/`order.reservation_expired` handlers themselves were removed again (see Part B note) once it was clear those two events shouldn't drive an email yet. Revisit in Phase 4: write the handler(s) for a real `order.paid` event (or similar), and reconsider at that point whether `order.reservation_expired` is still worth an email (arguably not — no money was ever taken, so there's nothing to apologize for).

- [ ] `ClientsModule.register([{ name: 'NOTIFICATIONS_SERVICE', transport: Transport.RMQ, options: { urls: [RABBITMQ_URL], queue: 'notifications_queue', queueOptions: { durable: true } } }])` registered where `OrdersModule`/the cron live — deferred to Phase 4.
- [ ] Replace `EventEmitter2.emit(...)` with `ClientProxy.emit(...)` at the real trigger point(s) once they exist — deferred to Phase 4.
- [ ] `EventEmitterModule` and `@nestjs/event-emitter` removed from `AppModule` and `package.json`, once nothing uses it anymore.

## Part D — Verification

- [x] `notifications` running standalone (no `backend` wiring yet): a hand-crafted `order.created` message published directly onto `notifications_queue` was received, logged, and a real email arrived at the Resend account's registered address.
- [ ] End-to-end from a real `backend` action — deferred to Phase 4 along with Part C (no handler currently exists to receive it — see Part B).
- [ ] Create a reservation with a *different* test user's email and confirm the sandbox-restriction rejection is logged clearly, without crashing the consumer or leaving the message unacknowledged — deferred to Phase 4, same reason.
- [ ] Confirm the manual-ack wiring actually matters: inspect RabbitMQ's management UI (or deliberately slow the handler) to see a message sit as "unacked" while `notifications` is mid-processing, rather than being marked delivered the instant it's received — deferred to Phase 4, same reason.

## Not in this step

- BullMQ for queued email/push work (`project-plan.md` §5, `extraction-design.md`'s "Not in this doc yet") — separate, later piece of Phase 3.
- A verified custom domain for Resend (would lift the sandbox recipient restriction) — not needed for this learning project.
- Part C/D's remaining items — deferred to Phase 4 (see Part C note above), not abandoned.
