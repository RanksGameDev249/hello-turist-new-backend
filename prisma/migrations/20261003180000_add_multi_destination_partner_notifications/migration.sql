ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PARTNER_PROMOTION';

ALTER TABLE "rides"
  ADD COLUMN IF NOT EXISTS "destinations" JSONB;

ALTER TABLE "curated_places"
  DROP CONSTRAINT IF EXISTS "curated_places_type_check";

ALTER TABLE "curated_places"
  ADD CONSTRAINT "curated_places_type_check"
  CHECK ("type" IN ('SPONSOR','HOMESTAY','HISTORICAL_PLACE','HOTEL','RESTAURANT','FOOD'));

ALTER TABLE "curated_places"
  ADD COLUMN IF NOT EXISTS "is_partner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notification_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "curated_places_partner_notification_idx"
  ON "curated_places"("is_partner","notification_enabled","is_active","type");
