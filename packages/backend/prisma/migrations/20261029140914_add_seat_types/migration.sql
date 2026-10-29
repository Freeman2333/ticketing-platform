/*
  Warnings:

  - You are about to drop the column `price` on the `seats` table. All the data in the column will be lost.
  - Added the required column `seat_type_id` to the `seats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events"."seats" DROP COLUMN "price",
ADD COLUMN     "seat_type_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "events"."seat_types" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "seat_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seat_types_event_id_label_key" ON "events"."seat_types"("event_id", "label");

-- AddForeignKey
ALTER TABLE "events"."seat_types" ADD CONSTRAINT "seat_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."seats" ADD CONSTRAINT "seats_seat_type_id_fkey" FOREIGN KEY ("seat_type_id") REFERENCES "events"."seat_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
