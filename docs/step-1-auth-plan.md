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

- [x] Scaffold `AuthModule` with the `public/`/`internal/` folder seam (`backend-design.md` §3).
- [x] `internal/`: `AuthController`, `AuthService`, Prisma-backed repositories.
- [x] `public/`: `AuthApi` interface + DTOs — `validateUser()`, `issueTokens()`, `getUserById()` (signatures sketched in `backend-design.md` §2).
- [x] Password hashing: `argon2id`.
- [x] JWT: short-lived access token (HS256, ~15 min) + refresh token (stored hashed, rotated on use) via `@nestjs/jwt`.
- [x] Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (reads/rotates the httpOnly/Secure/SameSite refresh cookie), `POST /auth/logout`, `GET /auth/me` (`backend-design.md` §5).
- [x] `JwtAuthGuard` + `RolesGuard`/`@Roles()` — wired globally now, even though only `auth` routes use them yet; `events`/`orders` reuse later.
- [x] Request pipeline in `main.ts`: global `ValidationPipe`, `helmet`, CORS restricted to `http://localhost:4200` with `credentials: true`, global exception filter normalizing the error shape (`backend-design.md` §6).
- [x] Module boundary lint rule for `auth/internal/` — `@nx/enforce-module-boundaries` only works between separate Nx projects, and `auth` is a folder inside the single `backend` project, so a plain ESLint `no-restricted-imports` rule (scoped to `packages/backend/src/**`, exempting `auth/` itself) is used instead; same intent as `backend-design.md` §3.5.
- [x] Unit tests for `AuthService` — `register`, `validateUser`, `issueTokens`, `rotateRefreshToken`, `revokeRefreshToken` (`getUserById` skipped, trivial one-liner).
- [~] E2E test (Supertest + Testcontainers): register → login → refresh → `GET /auth/me` — skipped by explicit decision, not a priority for this project right now.

## Part C — `@ticketing/auth-client` (shared library)

- [x] Scaffold `packages/auth-client` (repo convention is `packages/`, not `libs/`), package `@ticketing/auth-client`. Module Federation `shared: { singleton: true }` wiring deferred to Part D, when `shell`/`catalog` actually consume it.
- [x] `getAccessToken()`/`setAccessToken()`, `onAuthChange()`, and an axios interceptor attaching the bearer token and triggering refresh on 401 (with in-flight refresh dedup and a guard against refreshing the refresh call itself).

## Part D — Frontend `shell`

- [x] Add **React Router** to `shell` (top-level routing) and `catalog` (its own internal routing) — new decision, not previously fixed in `frontend-design.md`. `<BrowserRouter>` lives only in each package's own standalone `bootstrap.tsx`; the shared `App.tsx` exposed via Module Federation just uses `<Routes>`/`<Route>`, relying on whichever host already provides a router.
- [x] `AuthBootstrap` — attempts a silent refresh via the httpOnly cookie before rendering any protected content (`frontend-design.md` §2, `system-design.md` §8 A07). No protected content exists yet to actually gate - this just wires the token into memory before `App` renders.
- [x] `LoginPage` / `RegisterPage` — forms calling `@ticketing/auth-client` (react-hook-form + hand-written zod schemas, marked with `TODO(Step 1 Auth Part E)` comments for replacement once Orval generates these from the OpenAPI spec).
- [x] `Header` with an auth-aware login/logout control — `useIsAuthenticated()` (useSyncExternalStore over `@ticketing/auth-client`'s token store), logout redirects to `/`.

## Part E — `libs/api-client` (first generation)

- [x] Install Orval; generate `packages/api-client` from the backend's Swagger/OpenAPI JSON (now with real `auth` endpoints) — TanStack Query hooks (`frontend-design.md` §4). Package is `packages/api-client`, not `libs/api-client` — repo convention (`packages/`, not `libs/`) already established by `auth-client`/`ui`.
