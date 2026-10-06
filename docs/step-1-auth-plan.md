# Step 1 Implementation Plan — Auth

## Status

In progress. Breaks `project-plan.md` §8, Step 1 into concrete, ordered tasks, citing the module/interface names already locked in `backend-design.md` and `frontend-design.md`. One new decision made while drafting this plan: **React Router** for routing in `shell`/`catalog` (not previously fixed in `frontend-design.md` §2/§5).

## Part A — Prisma foundation (blocks everything else)

- [x] Install Prisma; `schema.prisma` with the `multiSchema` preview feature enabled, `datasource` pointing at `DATABASE_URL`.
- [x] Model the `auth` schema: `User` (id, email, password_hash, role enum, created_at), `RefreshToken` (id, user_id → User, token_hash, expires_at) — per `backend-design.md` §8.
- [x] First migration via `prisma migrate dev`, applied against the local Postgres (already running via `docker-compose.yml`).
- [x] `PrismaModule`/`PrismaService` — one shared connection pool for the whole Phase 1 monolith (`backend-design.md` §11), injected by the `auth` module (and later `events`/`orders`).
- [x] Add `DATABASE_URL` to the backend's actual `.env`, matching the credentials already in `docker-compose.yml`.

## Part B — Backend `auth` module

- [ ] Scaffold `AuthModule` with the `public/`/`internal/` folder seam (`backend-design.md` §3).
- [ ] `internal/`: `AuthController`, `AuthService`, Prisma-backed repositories.
- [ ] `public/`: `AuthApi` interface + DTOs — `validateUser()`, `issueTokens()`, `getUserById()` (signatures sketched in `backend-design.md` §2).
- [ ] Password hashing: `argon2id`.
- [ ] JWT: short-lived access token (HS256, ~15 min) + refresh token (stored hashed, rotated on use) via `@nestjs/jwt`.
- [ ] Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (reads/rotates the httpOnly/Secure/SameSite refresh cookie), `POST /auth/logout`, `GET /auth/me` (`backend-design.md` §5).
- [ ] `JwtAuthGuard` + `RolesGuard`/`@Roles()` — wired globally now, even though only `auth` routes use them yet; `events`/`orders` reuse later.
- [ ] Request pipeline in `main.ts`: global `ValidationPipe`, `helmet`, CORS restricted to `http://localhost:4200` with `credentials: true`, global exception filter normalizing the error shape (`backend-design.md` §6).
- [ ] `@nx/enforce-module-boundaries` with a `scope:auth` tag — first real module, so this is where it gets set up (`backend-design.md` §3.5).
- [ ] Unit tests for `AuthService`.
- [ ] E2E test (Supertest + Testcontainers): register → login → refresh → `GET /auth/me` — the template suite other modules copy (`backend-design.md` §9).

## Part C — `@ticketing/auth-client` (shared library)

- [ ] Scaffold `libs/auth-client`, package `@ticketing/auth-client`, published as a Module Federation shared singleton (`frontend-design.md` §3).
- [ ] `getAccessToken()`, `onAuthChange()`, and an axios interceptor attaching the bearer token and triggering refresh on 401.

## Part D — Frontend `shell`

- [ ] Add **React Router** to `shell` (top-level routing) and `catalog` (its own internal routing) — new decision, not previously fixed in `frontend-design.md`.
- [ ] `AuthBootstrap` — attempts a silent refresh via the httpOnly cookie before rendering any protected content (`frontend-design.md` §2, `system-design.md` §8 A07).
- [ ] `LoginPage` / `RegisterPage` — forms calling `@ticketing/auth-client`.
- [ ] `Header` with an auth-aware login/logout control.

## Part E — `libs/api-client` (first generation)

- [ ] Install Orval; generate `libs/api-client` from the backend's Swagger/OpenAPI JSON (now with real `auth` endpoints) — TanStack Query hooks (`frontend-design.md` §4).
