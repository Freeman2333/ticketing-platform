-- CreateTable
CREATE TABLE "events"."event_views" (
    "id" TEXT NOT NULL,
    "anon_id" TEXT,
    "user_id" TEXT,
    "event_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_views_user_id_viewed_at_idx" ON "events"."event_views"("user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "event_views_anon_id_viewed_at_idx" ON "events"."event_views"("anon_id", "viewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_views_anon_id_event_id_key" ON "events"."event_views"("anon_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_views_user_id_event_id_key" ON "events"."event_views"("user_id", "event_id");

-- AddForeignKey
ALTER TABLE "events"."event_views" ADD CONSTRAINT "event_views_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
