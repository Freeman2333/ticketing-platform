/*
  Warnings:

  - You are about to drop the `event_revenue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "events"."event_revenue" DROP CONSTRAINT "event_revenue_event_id_fkey";

-- DropTable
DROP TABLE "events"."event_revenue";

-- CreateTable
CREATE TABLE "events"."event_revenue_entries" (
    "order_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "event_revenue_entries_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE INDEX "event_revenue_entries_event_id_idx" ON "events"."event_revenue_entries"("event_id");

-- AddForeignKey
ALTER TABLE "events"."event_revenue_entries" ADD CONSTRAINT "event_revenue_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
