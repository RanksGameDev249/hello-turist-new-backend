CREATE TABLE "curated_places" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "history" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "images" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "amenities" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "price_from" DECIMAL(12,2),
  "phone" TEXT,
  "website" TEXT,
  "sponsor_name" TEXT,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "curated_places_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curated_places_type_check" CHECK ("type" IN ('SPONSOR','HOMESTAY','HISTORICAL_PLACE')),
  CONSTRAINT "curated_places_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "curated_places_type_active_idx" ON "curated_places"("type", "is_active");
CREATE INDEX "curated_places_city_active_idx" ON "curated_places"("city", "is_active");
CREATE INDEX "curated_places_location_idx" ON "curated_places"("latitude", "longitude");
