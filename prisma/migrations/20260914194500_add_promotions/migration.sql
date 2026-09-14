CREATE TABLE "promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "discount_type" TEXT NOT NULL,
  "discount_value" DECIMAL(12,2) NOT NULL,
  "max_discount" DECIMAL(12,2),
  "min_ride_amount" DECIMAL(12,2),
  "usage_limit" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_active_window_idx" ON "promotions"("is_active", "starts_at", "expires_at");
