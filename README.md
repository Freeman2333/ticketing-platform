# Ticketing Platform

A mini Ticketmaster-style app — browse events, pick seats, pay, get a ticket. Built as a learning project to go deep on backend architecture (NestJS modular monolith, message brokers, sagas) and microfrontends (Nx Module Federation), not as a product.

**Live demo:** [ticketing-platform-shell.vercel.app](https://ticketing-platform-shell.vercel.app)
**API docs (Swagger):** [ticketing-platform-wt3l.onrender.com/api/docs](https://ticketing-platform-wt3l.onrender.com/api/docs)

> Free-tier hosting, so the backend spins down after inactivity — the first request after a quiet period can take ~50s.

## Features

- Browse and search events, with a "recently viewed" list (anonymous or logged-in)
- Live seat map with real-time availability via WebSockets — a seat held by one shopper updates for everyone watching
- Distributed seat-hold locking (Redis) so two people can't grab the same seat in a race
- Reservation holds that auto-expire and release the seats if checkout isn't completed in time
- Real payment flow via Stripe Checkout (test mode), with webhook-verified, idempotent order confirmation
- JWT auth (register/login/refresh) with role-based access (attendee vs. organizer)
- Organizer tools: create events and venues, define seat layouts, upload posters

## Architecture

- **Backend**: NestJS modular monolith (`auth`, `events`, `orders`, `payments`) with strict module boundaries (public interfaces + DI tokens, no cross-module internal imports) — designed so any module can be extracted into a real microservice later without a rewrite.
- **Payment saga**: Stripe webhook → transactional outbox → RabbitMQ → a second module reacting to `payment.succeeded`, each step idempotent against at-least-once delivery.
- **Frontend**: Nx Module Federation — a thin `shell` host plus a `catalog` remote, consuming a typed API client generated from the backend's OpenAPI spec.
- **Data**: PostgreSQL (Prisma, multi-schema per module), Redis (locks, caching, rate limiting), RabbitMQ (the payment saga), S3-compatible object storage for event posters.

Full design rationale and the phased build log live in [`docs/`](./docs) — start with [`project-plan.md`](./docs/project-plan.md).

## Deployment

See [`docs/deployment-plan.md`](./docs/deployment-plan.md) for the full free-tier deployment setup (Render, Vercel, Neon, Upstash, CloudAMQP, Cloudflare R2).

## Local development

```sh
docker compose up -d        # Postgres, Redis, RabbitMQ, MinIO
npx nx serve backend
npx nx serve shell
npx nx serve catalog
```
