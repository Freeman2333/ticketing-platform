-- AlterTable: add as nullable first, backfill, then enforce NOT NULL.
-- Existing test events have no real duration, so 2 hours is a placeholder,
-- not a meaningful default - every real event sets its own endsAt going
-- forward via the API.
ALTER TABLE "events"."events" ADD COLUMN     "ends_at" TIMESTAMP(3);

UPDATE "events"."events" SET "ends_at" = "starts_at" + INTERVAL '2 hours' WHERE "ends_at" IS NULL;

ALTER TABLE "events"."events" ALTER COLUMN "ends_at" SET NOT NULL;
