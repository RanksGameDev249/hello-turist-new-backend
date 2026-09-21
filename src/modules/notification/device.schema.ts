import { z } from "zod";

export const notificationDeviceSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["ANDROID", "IOS", "WEB"]),
});

export const notificationDeviceTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export type NotificationDeviceInput = z.infer<typeof notificationDeviceSchema>;
