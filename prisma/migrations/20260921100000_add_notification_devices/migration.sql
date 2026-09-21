CREATE TABLE "notification_devices" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "fcm_token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_devices_fcm_token_key" UNIQUE ("fcm_token"),
  CONSTRAINT "notification_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notification_devices_user_id_enabled_idx" ON "notification_devices"("user_id", "enabled");
CREATE INDEX "notification_devices_last_seen_at_idx" ON "notification_devices"("last_seen_at");
