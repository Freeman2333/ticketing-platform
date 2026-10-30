-- Not expressible in schema.prisma - written by hand.
-- Needed for btree_gist's support of `=` comparisons (venue_id) inside a
-- GiST index, which otherwise only handles range/geometric operators.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No two events at the same venue may have overlapping time ranges.
-- tsrange(starts_at, ends_at) defaults to [starts_at, ends_at) - back-to-back
-- events (one ending exactly when the next starts) are not a conflict.
ALTER TABLE "events"."events" ADD CONSTRAINT no_overlapping_events
  EXCLUDE USING gist (venue_id WITH =, tsrange(starts_at, ends_at) WITH &&);