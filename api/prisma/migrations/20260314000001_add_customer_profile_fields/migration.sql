-- AddColumn: address, city, zip_code to users
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address" VARCHAR(200);
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "city" VARCHAR(50);
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "zip_code" VARCHAR(5);

-- AddIndex: user_id on orders
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "public"."orders"("user_id");
