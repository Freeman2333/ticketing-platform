# Integration Design — Ticketing Platform (Phase 1)

## Status

Complete for Phase 1. Scope is narrower than originally planned in `project-plan.md` §6: the API contract and auth hand-off are already covered by `system-design.md` §6/§8 and both subsystem docs, so this document only covers what nothing else does — the env/config contract and local dev topology.

## 1. Env/config contract

**Backend:**
- `DATABASE_URL` — Postgres connection string.
- `JWT_SECRET` — HS256 signing secret (`backend-design.md` §2).
- `CORS_ORIGIN` — the one allowed frontend origin (`backend-design.md` §6).
- `PORT` — the backend's listen port.
- `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` — for the backend's own writes (uploads processed via `sharp`, `backend-design.md` §2).
- `REDIS_URL`, `RABBITMQ_URL` — added when their phases arrive (Phase 2, Phase 3); not needed yet.

**Frontend:**
- Only environment variables prefixed `NX_PUBLIC_*` are ever bundled into client code (Nx/Rspack convention) — anything without that prefix stays server-only and is never exposed to the browser.
- `NX_PUBLIC_API_URL` — the backend's base URL, consumed by `libs/api-client`.
- `NX_PUBLIC_WS_URL` — the backend's WebSocket gateway URL, consumed by `socket.io-client` (`frontend-design.md` §8).

**Decision: no separate MinIO env var on the frontend.** `posterUrl` in every API response is always a full absolute URL, never a relative path — the frontend only ever uses the URL the backend gives it, so there's no second, independently-configured address that could drift out of sync with the backend's own MinIO config.

## 2. Local dev topology

- Ports: backend on `3000`; `shell` on `4200`; `catalog` on `4201` (`frontend-design.md` §5). `CORS_ORIGIN` in dev is `http://localhost:4200`.
- Only infrastructure is containerized — Postgres, Redis, RabbitMQ, MinIO (`backend-design.md` §10) — via `docker-compose`. The application code itself (backend, frontend) runs natively on the host via `nx serve`, for fast hot-reload; it is not containerized in dev. (Containerizing the app itself is a separate, later concern for production parity, not a Phase 1 dev-loop decision.)
- MinIO is reached directly on its own `docker-compose` port (e.g. `localhost:9000`) in Phase 1 — no reverse proxy in front of it locally yet. The "dedicated address, never a subpath" rule (`backend-design.md` §2/§10) is satisfied by its own port for now; an actual reverse proxy (Nginx/Traefik) only becomes relevant once horizontal scaling is introduced, in a later phase.
