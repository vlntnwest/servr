-- Add new OrderStatus enum values
ALTER TYPE "public"."order_status" ADD VALUE 'DRAFT';
ALTER TYPE "public"."order_status" ADD VALUE 'ABANDONED';
ALTER TYPE "public"."order_status" ADD VALUE 'PAYMENT_FAILED';

-- Add stripe_session_id to orders
ALTER TABLE "public"."orders" ADD COLUMN "stripe_session_id" TEXT;
CREATE INDEX "orders_stripe_session_id_idx" ON "public"."orders"("stripe_session_id");
