-- Add phone number and Firebase identity fields for all newly created accounts.
-- Nullable columns keep existing accounts migratable; application registration requires phone.
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "firebase_uid" TEXT;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
