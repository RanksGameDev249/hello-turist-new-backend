import { prisma } from "../../core/prisma";
import type { NotificationDeviceInput } from "./device.schema";

export async function registerNotificationDevice(userId: string, input: NotificationDeviceInput) {
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO notification_devices (id, user_id, fcm_token, platform, enabled, last_seen_at, created_at, updated_at)
    VALUES (${crypto.randomUUID()}::uuid, ${userId}::uuid, ${input.token}, ${input.platform}, true, ${now}, ${now}, ${now})
    ON CONFLICT (fcm_token)
    DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
      enabled = true, last_seen_at = EXCLUDED.last_seen_at, updated_at = EXCLUDED.updated_at
  `;
  return { registered: true, platform: input.platform };
}

export async function unregisterNotificationDevice(userId: string, token: string) {
  const result = await prisma.$executeRaw`
    UPDATE notification_devices
    SET enabled = false, updated_at = NOW()
    WHERE user_id = ${userId}::uuid AND fcm_token = ${token}
  `;
  if (result === 0) throw new Error("NOTIFICATION_DEVICE_NOT_FOUND");
  return { unregistered: true };
}

export async function listNotificationDevices(userId: string) {
  return prisma.$queryRaw<Array<{ id: string; platform: string; enabled: boolean; last_seen_at: Date; created_at: Date }>>`
    SELECT id, platform, enabled, last_seen_at, created_at
    FROM notification_devices
    WHERE user_id = ${userId}::uuid
    ORDER BY last_seen_at DESC
  `;
}
