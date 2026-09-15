CREATE TABLE "ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ride_id" UUID NOT NULL,
  "reviewer_id" UUID NOT NULL,
  "reviewee_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5),
  CONSTRAINT "ratings_reviewer_reviewee_check" CHECK ("reviewer_id" <> "reviewee_id")
);

CREATE UNIQUE INDEX "ratings_ride_id_reviewer_id_key" ON "ratings"("ride_id", "reviewer_id");
CREATE INDEX "ratings_reviewee_id_created_at_idx" ON "ratings"("reviewee_id", "created_at");
CREATE INDEX "ratings_reviewer_id_created_at_idx" ON "ratings"("reviewer_id", "created_at");

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_fkey"
  FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewee_id_fkey"
  FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
