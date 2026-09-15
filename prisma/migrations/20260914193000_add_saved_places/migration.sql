CREATE TABLE "saved_places" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "place_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "saved_places_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_places_user_id_created_at_idx" ON "saved_places"("user_id", "created_at");

ALTER TABLE "saved_places"
  ADD CONSTRAINT "saved_places_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
