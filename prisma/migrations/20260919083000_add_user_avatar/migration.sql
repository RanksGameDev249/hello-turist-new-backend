CREATE TABLE "user_profile_media" (
  "user_id" UUID NOT NULL,
  "avatar_url" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profile_media_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_profile_media_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
