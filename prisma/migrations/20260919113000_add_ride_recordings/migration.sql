CREATE TABLE "ride_recordings" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "uploader_user_id" UUID NOT NULL,
  "media_type" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADING',
  "checksum" TEXT,
  "retention_expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "ride_recordings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_recordings_object_key_key" UNIQUE ("object_key"),
  CONSTRAINT "ride_recordings_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_recordings_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_recordings_media_type_check" CHECK ("media_type" IN ('VIDEO','AUDIO')),
  CONSTRAINT "ride_recordings_status_check" CHECK ("status" IN ('UPLOADING','READY','FAILED','EXPIRED')),
  CONSTRAINT "ride_recordings_size_check" CHECK ("size_bytes" > 0)
);

CREATE INDEX "ride_recordings_ride_id_created_at_idx" ON "ride_recordings"("ride_id", "created_at");
CREATE INDEX "ride_recordings_uploader_user_id_created_at_idx" ON "ride_recordings"("uploader_user_id", "created_at");
CREATE INDEX "ride_recordings_retention_expires_at_idx" ON "ride_recordings"("retention_expires_at");
CREATE INDEX "ride_recordings_status_idx" ON "ride_recordings"("status");
