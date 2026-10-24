-- MoveSchema
ALTER TABLE "payments"."tickets" SET SCHEMA "orders";

-- AddForeignKey
ALTER TABLE "orders"."tickets" ADD CONSTRAINT "tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "orders"."order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
