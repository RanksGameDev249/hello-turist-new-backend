import { prisma } from "../../core/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { NotificationIdInput } from "./notification.schema";

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNotification(userId: string, { id }: NotificationIdInput) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");
  return notification;
}

export async function markNotificationRead(userId: string, { id }: NotificationIdInput) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: result.count };
}

export async function deleteNotification(userId: string, { id }: NotificationIdInput) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");

  await prisma.notification.delete({ where: { id } });
  return { id };
}

export async function createNotification(
  userId: string,
  input: {
    type: Prisma.NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  },
) {
  return prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
    },
  });
}
