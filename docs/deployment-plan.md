# Deployment Plan

## 1. Scope

Get the whole system (backend + both frontend MF apps + their infra dependencies) reachable over the public internet, using only free tiers, then add auto-deploy-on-commit. A learning goal, not a production-hardening one — no custom domains, no secrets manager, no staging environment yet.

Decided 2026-10-23: everything in this doc is done by hand first, through each provider's dashboard. Terraform (§6) is deferred until the manual setup works end-to-end, so Terraform syntax and unfamiliar cloud services aren't being debugged at the same time.

## 2. Why this can't be one platform

`backend` is not a stateless request/response app — it holds two kinds of long-lived connections that only work on an always-on process:

- The RabbitMQ hybrid-app consumer (`OrdersSagaController`, `app.connectMicroservice()` in `main.ts`) — there's no incoming HTTP request to trigger it; it has to sit connected to `orders_queue` and wait.
- The WebSocket gateway (`EventsGateway`) — a live seat-availability broadcast, not a one-shot response.

This rules out serverless/edge-function platforms (Vercel Functions, Netlify Functions) for `backend`. `shell` and `catalog` have no such requirement — they're static builds (Rspack output + Module Federation `remoteEntry.js`), a perfect fit for a static/serverless host.

So the system deploys to two different kinds of platform, matching the two different kinds of workload already drawn in `backend-design.md`/`frontend-design.md` — this isn't a compromise, it's the same shape production systems take for the same reason.

## 3. Chosen services (free tier)

| Component | Provider | Free tier | Replaces locally |
|---|---|---|---|
| Postgres | [Neon](https://neon.com) | 0.5GB storage, scale-to-zero, no expiry | `postgres` (docker-compose) |
| Redis | [Upstash](https://upstash.com) | 500K commands/month, 256MB | `redis` (docker-compose) |
| RabbitMQ | [CloudAMQP](https://cloudamqp.com) ("Little Lemur" plan) | 1M messages/month, 20 connections | `rabbitmq` (docker-compose) |
| Object storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 10GB storage, free egress, S3-compatible API | `minio` (docker-compose) |
| Backend (NestJS) | [Render](https://render.com) | Free web service, 750 instance-hours/month, spins down after 15 min idle | — |
| Frontend `shell` | Vercel or Netlify (not chosen yet, interchangeable) | Free static hosting | — |
| Frontend `catalog` | Same choice as `shell` | Free static hosting | — |

Render's own free Postgres was considered and rejected — it expires 30 days after creation with no migration path, which doesn't fit a project meant to keep running. Railway and Fly.io were considered and rejected — neither has a real ongoing free tier any more (trial credits only).

`PosterStorageService` already talks to S3 through a generic `S3Client` with a configurable `endpoint` (`MINIO_ENDPOINT`/`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`/`MINIO_BUCKET`) — switching to R2 is an env-var change, not a code change, assuming R2's S3-compatible endpoint accepts the same client config as MinIO (not yet verified against a real R2 bucket).

## 4. Deployment order

Order follows the dependency chain — each step needs a value (a URL or connection string) produced by the one before it.

1. **Provision the three managed infra services** — Neon (Postgres), Upstash (Redis), CloudAMQP (RabbitMQ), Cloudflare R2 (object storage). Each gives back a connection string/credentials, independent of anything else being deployed yet.
2. **Run Prisma migrations against the new Neon database** — from a local machine, with `DATABASE_URL` temporarily pointed at Neon (`npx prisma migrate deploy`). The schema has to exist before `backend` can start against it.
3. **Deploy `backend` to Render**, with env vars set to the real values from steps 1-2 (`DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `MINIO_*` pointed at R2, plus the existing `JWT_SECRET`/`STRIPE_SECRET_KEY`/`RESEND_API_KEY`). `FRONTEND_ORIGIN` gets a placeholder for now — Render assigns the service's public URL (`https://<name>.onrender.com`) at creation, before any frontend exists yet.
4. **Point the Stripe webhook at the real backend URL** — in the Stripe dashboard (test mode), register `https://<render-url>/api/payments/webhook` as a webhook endpoint (replacing local `stripe listen` forwarding). This gives a new `STRIPE_WEBHOOK_SECRET`, set back into Render's env vars.
5. **Deploy `catalog` (the Module Federation remote)** to the chosen static host. Get its public `remoteEntry.js` URL.
6. **Deploy `shell` (the Module Federation host)**, with its remotes config pointed at `catalog`'s real deployed URL from step 5 (`rspack.config.ts`'s `ModuleFederationPlugin` remotes, currently pointing at `localhost`), and `NX_PUBLIC_API_URL` pointed at the Render backend URL from step 3.
7. **Close the loop**: update `backend`'s `FRONTEND_ORIGIN` (CORS + WebSocket handshake + Stripe `success_url`/`cancel_url` base) to the real deployed `shell` URL from step 6, redeploy `backend`.
8. **Smoke test end-to-end** — the same checklist already used locally: register, browse an event, reserve seats, pay with a Stripe test card, confirm the webhook fires, confirm `Order.paid` and `Seat.booked` land in the real Neon database.

Steps 3 and 6-7 are circular in principle (backend needs the frontend's URL, frontend needs the backend's URL) — resolved by the fact that Render/Vercel/Netlify hand out a service's public URL as soon as it's created, before the first real deploy even finishes, so both sides exist to reference each other.

## 5. CI/CD: deploy on every commit

Decided: start with each platform's own native auto-deploy (Render and Vercel/Netlify all redeploy automatically on a push to the connected branch) — no GitHub Actions file needed for this to work at all. This is the simplest way to actually see "every commit deploys" happen.

GitHub Actions (2,000 free minutes/month on a private repo) is deferred, not rejected — a natural next step once a test/lint gate before deploy is wanted, since the native auto-deploy has no such gate on its own.

## 6. Terraform — deferred

Not now (§1). Revisit once §4 works end-to-end by hand, then describe the same resources as Terraform config instead of dashboard clicks. Providers confirmed to exist: official providers for Render, Vercel, and Upstash; a community provider for Neon (sponsored but not maintained by Neon itself); a CloudAMQP provider exists on the Terraform registry but its current documentation couldn't be verified.

## 7. Open questions

- `shell`/`catalog`: Vercel vs. Netlify — not chosen yet, treated as interchangeable until one is actually tried.
- Whether a GitHub Actions test/lint gate gets added in this same pass, or stays deferred past the first working deploy.
- ~~R2's S3-compatible endpoint hasn't actually been tried...~~ — verified 2026-10-23: `PosterStorageService`'s exact client config (`region: 'us-east-1'`, `forcePathStyle: true`) works against a real R2 bucket as-is, no code change needed.
- Custom domain, secrets manager, staging environment — explicitly out of scope (§1), not forgotten.
