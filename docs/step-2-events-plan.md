# Step 2 Implementation Plan — Events/Catalog

## Status

In progress. Breaks `project-plan.md` §8, Step 2 into concrete, ordered tasks, citing the module/interface names already locked in `backend-design.md` and `frontend-design.md` — same approach as `step-1-auth-plan.md`. Depends on Step 1 (Auth) being done, since `organizer`-only endpoints need `JwtAuthGuard`/`RolesGuard`, which already exist.

## Part A — Prisma: `events` schema

- [x] Model the `events` schema: `Venue` (id, organizer_id, name, address), `Event` (id, venue_id → `Venue`, title, starts_at, poster_url), `Seat` (id, event_id → `Event`, label, status, price) — per `backend-design.md` §8. Added one model at a time, not all three in one go.
- [x] Composite index on `seats(event_id, status)` — the hot "available seats for event X" query (`backend-design.md` §8).
- [x] Migration via `prisma migrate dev`. No new `PrismaModule`/`PrismaService` needed — reuses the one from Step 1 Part A.

## Part B — Backend `events` module (core CRUD, no realtime/upload yet)

- [ ] Scaffold `EventsModule` with the `public/`/`internal/` folder seam (`backend-design.md` §3), same pattern as `auth`.
- [ ] `internal/`: `EventsController`, `EventsService`, `VenuesController`, Prisma-backed repositories.
- [ ] `public/`: `EventsApi` interface + DTOs — `getEvent(id)`, `listEvents(filter)`, `getSeatAvailability(eventId)` (`backend-design.md` §2). `reserveSeats(eventId, seatIds)` is also part of the interface per the design doc, but nothing calls it yet — Orders (Step 3) is its only caller, so it's implemented here as a stub worth revisiting once Step 3 exists, not fully exercised.
- [ ] Endpoints: `GET /events`, `GET /events/:id`, `GET /events/:id/seats`, `POST /events`, `PATCH /events/:id`, `POST /venues`, `GET /venues`, `GET /venues/:id`, `PATCH /venues/:id` (`backend-design.md` §5). Mutating endpoints are `organizer`-only plus an ownership check, reusing `RolesGuard`/`@Roles()` from Step 1.
- [ ] `@ApiProperty()` (with `format`/`minLength`/`enum` where relevant) on every DTO from the start — Step 1 Part E found out the hard way that Swagger needs this to describe real fields, not empty objects.
- [ ] Unit tests for `EventsService`.

## Part C — WebSocket gateway (live seat availability)

- [ ] Socket.IO gateway (not raw `ws`) inside the `events` module — a client joins a room scoped to one event (`event:{id}`) and only receives updates for that event (`backend-design.md` §2/§5).
- [ ] Broadcast on a successful seat hold happens inside `EventsApi.reserveSeats()` itself — not a new cross-module communication pattern (`backend-design.md` §4). Real end-to-end exercise of this waits on Step 3 (Orders) actually calling `reserveSeats()`; for now, verify the gateway/room join-leave mechanics work in isolation.
- [ ] No Redis pub/sub adapter yet — single-instance only; that's a Phase 2 addition once Redis exists (`backend-design.md` §2 note).

## Part D — Event poster upload

- [ ] `POST /events/:id/poster` — `organizer` + ownership check (`backend-design.md` §2/§5).
- [ ] Processing with **sharp** (resize, WebP conversion) before writing to MinIO (`backend-design.md` §2, `system-design.md` §8).
- [ ] `events` module's own MinIO bucket/prefix — never shared with another module (`backend-design.md` §3, module isolation rule 1).
- [ ] Posters served directly from a dedicated MinIO hostname behind the reverse proxy — not presigned, not proxied through the backend (`backend-design.md` §2).

## Part E — `catalog` remote: browsing UI

- [ ] Regenerate `@ticketing/api-client` via Orval now that `events`/`venues` endpoints exist in the OpenAPI spec — same `orval.config.ts`, no new tooling (`frontend-design.md` §4).
- [ ] `CatalogRouter` — `catalog`'s own internal routing (`/` list, `/:eventId` details), entirely owned here, `shell` never sees it (`frontend-design.md` §2/§5).
- [ ] `EventList` + `EventCard` — list page with a debounced (~300ms) filter (`frontend-design.md` §2/§9).
- [ ] `EventDetailsPage` — event info + seat map as separate queries (`frontend-design.md` §2/§7); renders `EventInfo` and `SeatMap`.
- [ ] `Seat` component — memoized, `aria-label`'d (e.g. "Seat A12, available, $45"), status never conveyed by color alone (`frontend-design.md` §2/§10).
- [ ] `EventListSkeleton` / `SeatMapSkeleton` loading placeholders, added to `@ticketing/ui` (`frontend-design.md` §2).

## Part F — Real-time seat availability on the frontend

- [ ] `socket.io-client` wired inside `catalog` only — ordinary application code, not a Module Federation shared singleton, since nothing outside `catalog` needs it (`frontend-design.md` §8).
- [ ] `useSeatAvailability` — joins the `event:{id}` room when `EventDetailsPage` mounts, leaves on unmount; writes incoming updates into the TanStack Query cache via `setQueryData` rather than local state (`frontend-design.md` §2/§7/§8).
- [ ] Reconnect handling: Socket.IO's built-in retry, then re-join the room and trigger a manual refetch of the seat query on reconnect (`frontend-design.md` §8).

## Not in this step

- `ReservationPanel`/`ReserveButton` and the actual `POST /orders` call — that's Step 3 (Orders/Booking), which depends on this step for seats to exist (`project-plan.md` §8).
- Redis-based distributed locking for the "last seat" race — Phase 2 (`project-plan.md` §5).
