-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payments";

-- CreateEnum
CREATE TYPE "payments"."PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "orders"."OrderStatus" ADD VALUE 'paid';
ALTER TYPE "orders"."OrderStatus" ADD VALUE 'issued';

-- CreateTable
CREATE TABLE "payments"."payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stripe_session_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "payments"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."tickets" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qr_code_ref" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."outbox_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"."payments"("stripe_session_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"."payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_order_item_id_key" ON "payments"."tickets"("order_item_id");

-- CreateIndex
CREATE INDEX "outbox_events_published_at_idx" ON "payments"."outbox_events"("published_at");
