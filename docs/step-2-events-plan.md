# Step 2 Implementation Plan — Events/Catalog

## Status

In progress. Breaks `project-plan.md` §8, Step 2 into concrete, ordered tasks, citing the module/interface names already locked in `backend-design.md` and `frontend-design.md` — same approach as `step-1-auth-plan.md`. Depends on Step 1 (Auth) being done, since `organizer`-only endpoints need `JwtAuthGuard`/`RolesGuard`, which already exist.

## Part A — Prisma: `events` schema

- [x] Model the `events` schema: `Venue` (id, organizer_id, name, address), `Event` (id, venue_id → `Venue`, title, starts_at, poster_url), `Seat` (id, event_id → `Event`, label, status, price) — per `backend-design.md` §8. Added one model at a time, not all three in one go.
- [x] Composite index on `seats(event_id, status)` — the hot "available seats for event X" query (`backend-design.md` §8).
- [x] Migration via `prisma migrate dev`. No new `PrismaModule`/`PrismaService` needed — reuses the one from Step 1 Part A.

## Part B — Backend `events` module (core CRUD, no realtime/upload yet)

- [x] Scaffold `EventsModule` with the `public/`/`internal/` folder seam (`backend-design.md` §3), same pattern as `auth`.
- [x] `internal/`: `EventsController`, `EventsService`, `VenuesController`, Prisma-backed repositories.
- [x] `public/`: `EventsApi` interface + DTOs — `getEvent(id)`, `listEvents()`, `getSeatAvailability(eventId)` (`backend-design.md` §2). `listEvents()` has no filter parameter yet - its shape isn't decided anywhere, so it's deferred rather than guessed. `reserveSeats(eventId, seatIds)` is also part of the interface per the design doc, but nothing calls it yet — Orders (Step 3) is its only caller, so it's implemented here as a stub, not fully exercised.
- [x] Endpoints: `GET /events`, `GET /events/:id`, `GET /events/:id/seats`, `POST /events`, `PATCH /events/:id`, `POST /venues`, `GET /venues`, `GET /venues/:id`, `PATCH /venues/:id` (`backend-design.md` §5). Mutating endpoints are `organizer`-only plus an ownership check (returns 404, not 403, on an ownership mismatch - doesn't reveal another organizer's resource exists), reusing `RolesGuard`/`@Roles()` from Step 1 - also required adding `RolesGuard` as a global `APP_GUARD` in `AppModule`, which hadn't been wired yet since nothing used `@Roles()` before this.
- [x] `@ApiProperty()` (with `format`/`minLength`/`enum` where relevant) on every DTO from the start — Step 1 Part E found out the hard way that Swagger needs this to describe real fields, not empty objects.
- [~] Unit tests for `EventsService` — skipped by explicit decision, not a priority for this project right now.

## Part C — WebSocket gateway (live seat availability)

- [x] Socket.IO gateway (not raw `ws`) inside the `events` module — a client joins a room scoped to one event (`event:{id}`) and only receives updates for that event (`backend-design.md` §2/§5). `EventsGateway` with `joinEvent`/`leaveEvent` handlers; had to pin `@nestjs/websockets`/`@nestjs/platform-socket.io` to the 11.x line (not latest 12.x) to match this project's Nest 11 core.
- [x] Broadcast on a successful seat hold happens inside `EventsApi.reserveSeats()` itself — not a new cross-module communication pattern (`backend-design.md` §4). Gateway/room join-leave mechanics verified in isolation (Socket.IO handshake + room join/leave both confirmed working); actually wiring the broadcast call waits on Step 3 (Orders) calling `reserveSeats()` with a real implementation.
- [x] No Redis pub/sub adapter yet — single-instance only; that's a Phase 2 addition once Redis exists (`backend-design.md` §2 note). Nothing to do here, confirmed as intentionally out of scope.

## Part D — Event poster upload

- [x] `POST /events/:id/poster` — `organizer` + ownership check (`backend-design.md` §2/§5). Verified end-to-end: uploaded a real JPEG, got back a `posterUrl`, downloaded it directly from `s3mock` and confirmed it's a real 1200x630 WebP file.
- [x] Processing with **sharp** (resize, WebP conversion) before writing to MinIO (`backend-design.md` §2, `system-design.md` §8). `processPosterImage()` — resize to 1200x630 (`fit: 'cover'`) + WebP conversion; the exact dimensions aren't fixed anywhere in the design docs, so this is an arbitrary-but-reasonable default, not a locked decision.
- [x] `events` module's own MinIO bucket/prefix — never shared with another module (`backend-design.md` §3, module isolation rule 1). Uses `MINIO_BUCKET` (`event-posters`) with an `events/{id}.webp` key prefix.
- [x] Posters served directly from a dedicated MinIO hostname behind the reverse proxy — not presigned, not proxied through the backend (`backend-design.md` §2). `posterUrl` is the direct `s3mock` URL; also had to add the missing `MINIO_ENDPOINT` var to `.env`/`.env.example` (documented in `integration-design.md` §1 but never actually added until now).

## Part E — `catalog` remote: browsing UI

- [x] Regenerate `@ticketing/api-client` via Orval now that `events`/`venues` endpoints exist in the OpenAPI spec — same `orval.config.ts`, no new tooling (`frontend-design.md` §4). Also found and fixed a real gap along the way: `catalog` never had Tailwind/PostCSS wired up at all (no `styles.css`, no CSS rule in `rspack.config.ts`) - harmless while it only rendered placeholder text, but it meant `EventDto.posterUrl`'s image rendered at native pixel size (1200x630) once real content showed up. Fixed to match `shell`'s setup exactly, including `@tanstack/react-query`/`@ticketing/api-client`/`@ticketing/auth-client` as MF shared singletons and `QueryClientProvider` for standalone dev.
- [x] `CatalogRouter` — `catalog`'s own internal routing (`/` list, `/:eventId` details), entirely owned here, `shell` never sees it (`frontend-design.md` §2/§5).
- [x] `EventList` + `EventCard` — list page with a debounced (~300ms) filter (`frontend-design.md` §2/§9). `EventCard` built from `@ticketing/ui` primitives (`Card` + new `Badge`, ported the same way as `Card`/`Select`/`Form`): poster with `aspect-video`, title, date. The filter required a backend decision we'd deferred - `GET /events?title=` (case-insensitive substring match) added to `EventsController`/`EventsService`/`EventsRepository`/`EventsApi`; frontend debounces via a plain `useState`+`useEffect`+`setTimeout` (no library). Known gap: `EventDto` has no venue name (only `venueId`), so venue isn't shown on the card yet - would need a backend change, out of scope for this line. Also found an Orval bug: a *named* nullable primitive (`EventDtoPosterUrl`) generates as `{ [key: string]: unknown } | null` instead of `string | null` - confirmed in `@orval/core`'s source, worked around with a cast at the one usage site rather than chasing the library bug.
- [x] `EventDetailsPage` — event info + seat map as separate queries (`frontend-design.md` §2/§7); fetches via `useEventsControllerGetEvent`/`useEventsControllerGetSeats`. Shows poster/title/date and a seat count - not the full `EventInfo`/`SeatMap` component split yet, since the actual seat grid design is still deferred (see `Seat` component line below). Also fixed a real bug found while testing this: `shell` mounted `catalog` at a bare `/` `Route` with no wildcard, so any URL `catalog` generates internally (e.g. clicking into an event) didn't match any of `shell`'s own routes and rendered nothing - changed to `/*` per `frontend-design.md` §5's prefix pattern.
- [ ] `Seat` component — memoized, `aria-label`'d (e.g. "Seat A12, available, $45"), status never conveyed by color alone (`frontend-design.md` §2/§10).
- [ ] `EventListSkeleton` / `SeatMapSkeleton` loading placeholders, added to `@ticketing/ui` (`frontend-design.md` §2).

## Part F — Real-time seat availability on the frontend

- [ ] `socket.io-client` wired inside `catalog` only — ordinary application code, not a Module Federation shared singleton, since nothing outside `catalog` needs it (`frontend-design.md` §8).
- [ ] `useSeatAvailability` — joins the `event:{id}` room when `EventDetailsPage` mounts, leaves on unmount; writes incoming updates into the TanStack Query cache via `setQueryData` rather than local state (`frontend-design.md` §2/§7/§8).
- [ ] Reconnect handling: Socket.IO's built-in retry, then re-join the room and trigger a manual refetch of the seat query on reconnect (`frontend-design.md` §8).

## Not in this step

- `ReservationPanel`/`ReserveButton` and the actual `POST /orders` call — that's Step 3 (Orders/Booking), which depends on this step for seats to exist (`project-plan.md` §8).
- Redis-based distributed locking for the "last seat" race — Phase 2 (`project-plan.md` §5).
