-- AlterTable: add nullable first, backfill, then enforce NOT NULL.
-- Backfill source: venue.organizer_id, since event creation has always been
-- restricted to the venue's own owner (POST /events checks this), so
-- creator == venue owner for every row that exists today.
ALTER TABLE "events"."events" ADD COLUMN "organizer_id" TEXT;

UPDATE "events"."events" e
SET "organizer_id" = v.organizer_id
FROM "events"."venues" v
WHERE e.venue_id = v.id;

ALTER TABLE "events"."events" ALTER COLUMN "organizer_id" SET NOT NULL;
