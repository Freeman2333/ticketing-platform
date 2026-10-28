# Step 7 Implementation Plan — Organizer Dashboard (Phase 6)

## Status

In progress. `project-plan.md` §5 lists this under Phase 6 ("Microfrontend expansion... admin dashboard"), originally scheduled after Phase 5 (Kafka + analytics) — reordered ahead of it by explicit choice (2026-10-26), since Phase 5 isn't designed yet and this phase has a concrete, already-partially-built priority (event/venue/seat management).

Part A (scope) decided. Part B (MFE scaffold + role gating) done. Part C (backend gap) mostly done. Part D: venues list + create done, venue details/stats and all event pages not started.

## Part A — Scope

- [x] This is an **organizer self-service portal**, not a platform-wide admin panel. `project-plan.md`'s "admin dashboard" wording is imprecise — the actual priority (create event, add venues/seats, set prices) maps to the existing `Role.organizer` and its ownership-scoped endpoints (`venue.organizerId === req.user.sub`), not `Role.admin`, which exists in the schema but is unused by any endpoint. A true platform-wide admin view, if ever built, is a separate future piece.
- [x] Pages for this first version:

  | Route | Purpose |
  |---|---|
  | `/organizer` | List of the organizer's own events — a compact row list (small thumbnail + title, etc.), not the showcase-style `EventCard` the public catalog uses for attendees picking an event |
  | `/organizer/venues` | List of the organizer's own venues (as links) |
  | `/organizer/venues/new` | Create venue form — a separate page from the list, not combined on one screen |
  | `/organizer/venues/:id` | Venue details (incl. image) + the list of its own events |
  | `/organizer/events/new` | Create event (pick an existing venue) |
  | `/organizer/events/:id` | Event details + basic stats + seat/price management |
  | `/organizer/events/:id/edit` | Edit event |

- [x] Stats on the event details page are computed from data already returned by the existing, public `GET /events/:id/seats` (each seat has `status` and `price`) — no new backend aggregation needed for this first version. A richer, cross-event CQRS read-model (discussed separately) is a later, independent enhancement, not a prerequisite.
- [x] Deferred, not scoped in this step: CQRS read-model for dashboard stats, a GraphQL/BFF layer (only worth it if this grows into a full multi-entity admin panel), Elasticsearch (only if search/filtering at scale is needed), an AI-agent/copilot (natural-language queries over organizer data, likely as its own `/organizer/assistant` page later, feeding off the CQRS aggregates once those exist).

## Part B — MFE scaffold + role gating

- [x] New Nx/rspack app `packages/organizer`, mirroring `catalog`'s Module Federation setup (`ModuleFederationPlugin`, `exposes: { './App': './src/App.tsx' }`, shared singletons for `react`/`react-dom`/`react-router-dom`/`@tanstack/react-query`/`@ticketing/auth-client`). Verified standalone on port 4202 before wiring into `shell`.
- [x] Registered in `shell/public/remotes-manifest.json`, mounted at `/organizer/*` in `shell/src/App.tsx`.
- [x] `useUserRole()` added to `@ticketing/auth-client` — decodes the `role` claim already present in the JWT access token (no extra API call). `Header.tsx` shows the "Organizer" nav link only for `role === 'organizer'`. A new `RequireRole` wrapper in `shell` redirects to `/` for any other role when navigating to `/organizer` directly. This is a UX gate only — real enforcement stays server-side via `RolesGuard`.

## Part C — Backend gap

- [x] `GET /events` is public with no organizer filter. Added `GET /events/mine` (`@Roles(Role.organizer)`), mirroring `VenuesController.findMine()` (`venuesRepository.findByOrganizerId(req.user.sub)`). Implemented and committed; manual end-to-end verification (real browser flow) deferred.
- [x] `Venue` has no image field (`name`/`address` only, unlike `Event.posterUrl`). Added `imageUrl String?` + migration, and `POST /venues/:id/image` mirroring `events.controller.ts`'s `uploadPoster` — reuses the already-generic `PosterStorageService.upload(key, buffer, contentType)` and `processPosterImage` (sharp resize to webp), just a different S3 key prefix (`venues/${id}.webp` vs `events/${id}.webp`). Implemented and committed.
- [ ] Venue-level stats (tickets sold / revenue across all of a venue's events) — decided 2026-10-27: a venue's stats are an aggregate across multiple events, unlike a single event's stats (one `GET /events/:id/seats` call). Computing this by fetching every event's seats client-side would be N+1. Add `GET /venues/:id/stats`, one Prisma aggregate query (`seat.aggregate` filtered through `event.venueId`) — not CQRS. CQRS was considered (the user explicitly wants to learn it hands-on) but rejected **for now**: the existing `order.issued`/`payment.succeeded` outbox payloads don't carry `venueId`, so a projector would need payload enrichment or its own lookups, and building that now would stall the still-unfinished core CRUD scope (Part D). Plan: ship the plain aggregate endpoint now, revisit this exact feature as a dedicated CQRS exercise later — rebuilding the same stats via a `dashboard` module read-model once Part D is done, so the "before/after" comparison is concrete.

## Part D — Pages

- [x] `/organizer/venues` — list (`GET /venues`, already organizer-scoped), each row a `VenueListItem` component linking to `/organizer/venues/:id`. Empty state links to the create page, doesn't inline the form. Implemented and committed.
- [x] `/organizer/venues/new` — single form (name, address, image dropzone together — not split into two steps), submits `POST /venues` then `POST /venues/:id/image` sequentially under one "Create" action. Image picker uses `react-dropzone` (not hand-rolled — avoids the drag-leave-on-child-element flicker and missing drop-time type filtering a custom version had). Implemented and committed.
- [ ] `/organizer/venues/:id` — venue details (`GET /venues/:id`, image upload) + its events, filtered client-side from `GET /events/mine` by `venueId` (no new "events by venue" endpoint needed) + stats from `GET /venues/:id/stats` (Part C).
- [ ] `/organizer` — events list, once Part C's endpoint exists.
- [ ] `/organizer/events/new` — create form (`POST /events`, venue picked from Part D's venues list) → redirect into seat/price setup (`POST /events/:id/seats`).
- [ ] `/organizer/events/:id` — details + stats (derived from `GET /events/:id/seats`) + seat/price management.
- [ ] `/organizer/events/:id/edit` — edit form (`PATCH /events/:id`).

## Not in this step

- Platform-wide admin role/view (`Role.admin` stays unused).
- CQRS read-model, GraphQL/BFF, Elasticsearch, AI-agent — all explicitly deferred (Part A). Venue-level stats specifically are earmarked as the future CQRS learning exercise (Part C) — rebuild the same feature, not a new one.
