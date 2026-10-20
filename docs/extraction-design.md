# Microservice Extraction Design — Phase 3 (`notifications`)

## 1. Scope

Phase 3 per `project-plan.md` §5: extract `notifications` as a genuinely separate service — the first real decomposition of the monolith, not a simulation of one.

Revised 2026-10-20: `notifications` sends real email via **Resend** (free tier, no card required) rather than a local SMTP catcher like Mailpit — the user explicitly wants actual delivery to a real inbox, not just an inspectable fake one.

Real constraint this brings: without a verified custom domain (which this project doesn't have), Resend's free tier only delivers to the email address the Resend account itself was registered with ("sandbox" mode) — sending to any other address is rejected. This is accepted as-is rather than engineered around, since it's an honest limitation of free tooling, not a bug. Each send is wrapped in `try/catch`: a Resend rejection is logged (clearly distinguishing "sandbox restriction" from other failures) but does **not** throw — the RabbitMQ message is still acknowledged, since the *event itself* was handled correctly; only the real-world delivery is constrained by the free tier, which is a separate concern from "did `notifications` do its job."

## 2. Transport: RabbitMQ from the start, not TCP/Redis

`project-plan.md` originally sketched "start with a TCP/Redis transport to feel the shape of the problem, then move to RabbitMQ." Revised 2026-10-20: for a notification, a lost message is a real functional bug (a user silently never gets their booking confirmation), and neither candidate transport matches how this is actually done in production:

- **Raw TCP** (NestJS's TCP transport) is a request/response RPC mechanism, not a messaging substitute — it's compared with HTTP/gRPC, not with message brokers.
- **Redis pub/sub** is fire-and-forget: a subscriber that's down at publish time (restarting, deploying, crashed) simply never sees the message, with no trace it was ever sent.
- **RabbitMQ** has the delivery guarantees this actually needs: unacknowledged messages are redelivered, and a dead-letter queue exists for messages that repeatedly fail.

So Phase 3 goes straight to RabbitMQ as `notifications`'s transport. `project-plan.md` §5 updated to match.

## 3. Shape of the extraction: a real separate process

A new Nx application, `packages/notifications`, with its own `main.ts` bootstrapping a NestJS **microservice** (`NestFactory.createMicroservice()`, `Transport.RMQ`) — not a hybrid listener bolted onto the existing `backend` process via `connectMicroservice()`. The latter would still be one process, one deployable, one failure domain — not the decomposition this phase exists to practice. `notifications` is a genuinely separate, independently deployable Node process from day one.

## 4. Producer side: `backend` publishes to RabbitMQ, not `EventEmitter2`

`OrdersService.createOrder()` and `HoldExpiryCron.releaseExpiredHolds()` currently emit `OrderCreatedEvent`/`OrderReservationExpiredEvent` via `EventEmitter2` (`@nestjs/event-emitter`) — in-process only, and (confirmed by searching the codebase) nothing else has ever listened to them; `EventEmitterModule` existed purely as a placeholder for this exact future consumer (`step-3-orders-plan.md` Part B). An in-process emitter is useless to a consumer that's now a separate OS process — it would never see the event at all.

Both emit call sites switch to publishing the same payloads to RabbitMQ via a `ClientProxy` (`@nestjs/microservices`, `Transport.RMQ`) instead. `EventEmitterModule` is removed from `AppModule` entirely once both call sites are migrated — nothing else uses it.

## 5. Queue design

One shared, **durable** queue: `notifications_queue`. Both event types are published there; `notifications` distinguishes them inside the same queue via NestJS's pattern dispatch — `@EventPattern('order.created')` and `@EventPattern('order.reservation_expired')` as two separate handlers in the one microservice, not two separate queues. This matches NestJS's own convention (one queue per consuming microservice, multiplexed by pattern) rather than a full AMQP exchange/routing-key topology, which isn't needed for two event types going to one consumer.

## 6. Acknowledgment: manual, not NestJS's default

Found by checking the NestJS docs before implementing, not assumed: `@nestjs/microservices`'s RMQ transport defaults to **automatic** acknowledgment (`noAck: true`) — a message counts as delivered the instant it's *received*, not once it's been *processed*. If `notifications` crashed mid-processing (e.g. partway through actually sending the email via Mailpit) under that default, RabbitMQ would already consider the message handled and never redeliver it — silently defeating the entire reason RabbitMQ was chosen over Redis pub/sub in §2.

Fix: `noAck: false` on the microservice's RMQ options (enables manual ack mode), and each handler calls `channel.ack(originalMsg)` (via `RmqContext`) only **after** its processing succeeds. A crash before that call leaves the message unacknowledged, so RabbitMQ redelivers it to the next available consumer instead of losing it.

## Not in this doc yet

- BullMQ for queued email/push work (`project-plan.md` §5) — a separate, later piece of Phase 3, not bundled into this first extraction.
- The actual task breakdown (new Nx app scaffolding, `docker-compose.yml` additions, RabbitMQ connection details, `nodemailer`/Mailpit wiring, verification) — to be written as `step-5-notifications-plan.md` once this design is fully agreed, matching the pattern used for Steps 1-4.
