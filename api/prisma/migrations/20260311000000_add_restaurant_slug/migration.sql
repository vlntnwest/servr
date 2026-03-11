-- AlterTable
ALTER TABLE "public"."restaurants" ADD COLUMN "slug" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "public"."restaurants"("slug");
