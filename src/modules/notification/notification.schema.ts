import { z } from "zod";

export const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationIdInput = z.infer<typeof notificationIdSchema>;
