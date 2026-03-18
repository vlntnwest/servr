CREATE TABLE "public"."exceptional_hours" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "is_closed" BOOLEAN NOT NULL DEFAULT true,
  "open_time" TEXT,
  "close_time" TEXT,
  "label" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'utc'::text),
  "updated_at" TIMESTAMP(6),
  CONSTRAINT "exceptional_hours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exceptional_hours_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "exceptional_hours_restaurant_id_date_key" ON "public"."exceptional_hours"("restaurant_id", "date");
CREATE INDEX "exceptional_hours_restaurant_id_idx" ON "public"."exceptional_hours"("restaurant_id");
