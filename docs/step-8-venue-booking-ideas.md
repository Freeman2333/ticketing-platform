# Step 8 — Venue Booking (Idea Backlog)

## Status

Not scoped, not scheduled. Recorded 2026-10-30 while designing `/organizer/events/new`, so the idea isn't lost — not yet broken into an implementation plan the way `step-7-organizer-dashboard-plan.md` is. Revisit and turn into a real plan when Part D/E of Phase 6 (organizer dashboard) are fully done.

## The idea

Today, every venue-scoped check in the codebase assumes one organizer exclusively owns a venue (`venue.organizerId === req.user.sub`, checked in every events/seats/stats endpoint). The idea is to relax this: let organizers optionally make their venue available to *other* organizers, not just themselves.

- [ ] `Venue` gains a public/private flag. A private venue works exactly as today (owner-only). A public venue can have events booked into it by other organizers too.
- [ ] Booking a public venue is **not instant** — it goes through an approval step, the venue's owner has to confirm before the event is considered booked. Mirrors the `Order.status` state-machine shape already in the codebase (`draft → reserved → paid → issued`, each transition through the outbox) rather than inventing a new pattern — likely something like `requested → approved → rejected` on whatever entity represents the booking.
- [ ] `Event` needs a real time range, not just `startsAt` — a duration or `endsAt`, since "does this booking conflict with another" is undefined without one.
- [ ] Double-booking protection: once a venue has a confirmed event in a time range, that range can't be booked again (by the owner or anyone else). Two directions considered, not chosen yet:
  - A Postgres range type (`tstzrange`) + `EXCLUDE USING gist (venue_id WITH =, time_range WITH &&)` constraint — the database itself refuses an overlapping insert, atomically, no application-level locking.
  - A Redis distributed lock around the check-then-create sequence, mirroring `SeatLockService`'s existing pattern, applied to venue scheduling instead of seat holds.
- [ ] Explicitly rejected: timezone handling for venues/events. Real-world concern, but out of scope here.

## Why recorded, not built

This isn't a small addition — it changes the ownership model that every venue/event endpoint currently assumes, not a flag to bolt on. Needs its own design pass (does the booking live on `Event` directly or a separate request entity? does `EXCLUDE` constraint or Redis lock win, or is there a reason to want both?) before it becomes a real implementation plan.
