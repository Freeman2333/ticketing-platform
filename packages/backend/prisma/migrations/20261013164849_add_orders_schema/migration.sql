-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "orders";

-- CreateEnum
CREATE TYPE "orders"."OrderStatus" AS ENUM ('draft', 'reserved', 'cancelled');

-- CreateTable
CREATE TABLE "orders"."orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" "orders"."OrderStatus" NOT NULL DEFAULT 'draft',
    "reserved_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"."orders"("user_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "orders"."order_items"("order_id");

-- AddForeignKey
ALTER TABLE "orders"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
