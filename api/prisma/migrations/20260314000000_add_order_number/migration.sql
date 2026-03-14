-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN "order_number" VARCHAR(6);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "public"."orders"("order_number");
