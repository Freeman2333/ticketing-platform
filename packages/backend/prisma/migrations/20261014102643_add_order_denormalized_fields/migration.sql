/*
  Warnings:

  - Added the required column `seat_label` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_starts_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_title` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders"."order_items" ADD COLUMN     "seat_label" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders"."orders" ADD COLUMN     "event_starts_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "event_title" TEXT NOT NULL;
