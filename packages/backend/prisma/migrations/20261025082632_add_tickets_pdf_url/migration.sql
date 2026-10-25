-- AlterTable
ALTER TABLE "orders"."orders" ADD COLUMN     "tickets_pdf_url" TEXT;

-- AlterTable
ALTER TABLE "orders"."tickets" DROP COLUMN "qr_code_ref";
