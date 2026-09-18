ALTER TABLE "users"
  ADD COLUMN "phone" VARCHAR(20),
  ADD COLUMN "google_subject" TEXT,
  ADD COLUMN "firebase_uid" TEXT,
  ADD COLUMN "profile_image_url" TEXT;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
