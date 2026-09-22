import { Request, Response } from "express";
import { prisma } from "../../core/prisma";
import { createNotification } from "../notification/notification.service";

export async function listAdminNotifications(req: Request, res: Response) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true, username: true } } },
  });
  return res.json({ notifications });
}

export async function sendAdminNotification(req: Request, res: Response) {
  const { userId, title, body, data } = req.body ?? {};
  if (typeof userId !== "string" || typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
    return res.status(400).json({ error: "INVALID_NOTIFICATION" });
  }
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  const notification = await createNotification(user.id, {
    type: "SYSTEM" as never,
    title: title.trim(),
    body: body.trim(),
    data: data ?? undefined,
  });
  return res.status(201).json(notification);
}
