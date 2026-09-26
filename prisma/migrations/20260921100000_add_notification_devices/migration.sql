-- notification_devices was already created by
-- 20260919080000_add_wallet_notification_devices.
-- This migration only adds the additional index introduced later.
CREATE INDEX IF NOT EXISTS "notification_devices_last_seen_at_idx"
  ON "notification_devices"("last_seen_at");
