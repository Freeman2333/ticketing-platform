-- CreateTable
CREATE TABLE "events"."event_revenue" (
    "event_id" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_revenue_pkey" PRIMARY KEY ("event_id")
);

-- AddForeignKey
ALTER TABLE "events"."event_revenue" ADD CONSTRAINT "event_revenue_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
