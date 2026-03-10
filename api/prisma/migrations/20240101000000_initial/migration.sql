-- Initial schema migration
-- Note: The public.users table has a FK to auth.users managed by Supabase,
-- not tracked here. This migration covers application tables only.

CREATE TYPE "public"."restaurant_role" AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE "public"."order_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'PENDING_ON_SITE_PAYMENT');

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT UNIQUE,
    "full_name" VARCHAR(50),
    "phone" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "zip_code" VARCHAR(5) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "image_url" TEXT,
    "stripe_account_id" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."restaurant_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "public"."restaurant_role" NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "restaurant_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "restaurant_members_restaurant_id_user_id_key" UNIQUE ("restaurant_id", "user_id"),
    CONSTRAINT "restaurant_members_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE,
    CONSTRAINT "restaurant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."opening_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opening_hours_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "opening_hours_restaurant_id_idx" ON "public"."opening_hours"("restaurant_id");

CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sub_heading" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "categories_restaurant_id_idx" ON "public"."categories"("restaurant_id");

CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "image_url" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "discount" DECIMAL(10,2) DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "products_restaurant_id_idx" ON "public"."products"("restaurant_id");

CREATE TABLE IF NOT EXISTS "public"."products_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "categorie_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "products_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_categories_product_id_categorie_id_key" UNIQUE ("product_id", "categorie_id"),
    CONSTRAINT "products_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "products_categories_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."option_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "has_multiple" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "min_quantity" INTEGER NOT NULL,
    "max_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "option_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "option_groups_product_id_idx" ON "public"."option_groups"("product_id");

CREATE TABLE IF NOT EXISTS "public"."option_choices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "option_group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price_modifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "option_choices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "option_choices_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" VARCHAR(50),
    "phone" VARCHAR(50),
    "email" VARCHAR(50),
    "status" "public"."order_status" NOT NULL DEFAULT 'PENDING',
    "total_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    "updated_at" TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "orders_restaurant_id_idx" ON "public"."orders"("restaurant_id");

CREATE TABLE IF NOT EXISTS "public"."order_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "order_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_products_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE,
    CONSTRAINT "order_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "order_products_order_id_idx" ON "public"."order_products"("order_id");

CREATE TABLE IF NOT EXISTS "public"."order_product_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_product_id" UUID NOT NULL,
    "option_choice_id" UUID NOT NULL,
    CONSTRAINT "order_product_options_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_product_options_order_product_id_fkey" FOREIGN KEY ("order_product_id") REFERENCES "public"."order_products"("id") ON DELETE CASCADE,
    CONSTRAINT "order_product_options_option_choice_id_fkey" FOREIGN KEY ("option_choice_id") REFERENCES "public"."option_choices"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "order_product_options_order_product_id_idx" ON "public"."order_product_options"("order_product_id");

CREATE TABLE IF NOT EXISTS "public"."invitation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."restaurant_role" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'::text),
    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitation_tokens_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "invitation_tokens_token_idx" ON "public"."invitation_tokens"("token");
