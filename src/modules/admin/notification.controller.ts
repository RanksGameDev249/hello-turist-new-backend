import { Request, Response } from "express";
import { prisma } from "../../core/prisma";
import { createNotification } from "../notification/notification.service";

function ok(req: Request, res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data, error: null, requestId: req.requestId });
}

function fail(req: Request, res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, data: null, error: { code, message }, requestId: req.requestId });
}

export async function listAdminNotifications(req: Request, res: Response) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    return ok(req, res, { items: notifications });
  } catch (error) {
    console.error("ADMIN_NOTIFICATIONS_LIST_ERROR:", error);
    return fail(req, res, 500, "ADMIN_NOTIFICATIONS_LIST_FAILED", "Unable to load admin notifications");
  }
}

export async function sendAdminNotification(req: Request, res: Response) {
  const { userId, title, body, data } = req.body ?? {};
  if (typeof userId !== "string" || typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
    return fail(req, res, 400, "INVALID_NOTIFICATION", "User, title and message are required");
  }
  try {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) return fail(req, res, 404, "USER_NOT_FOUND", "User not found");
    const notification = await createNotification(user.id, {
      type: "SYSTEM" as never,
      title: title.trim(),
      body: body.trim(),
      data: data ?? undefined,
    });
    return ok(req, res, notification, 201);
  } catch (error) {
    console.error("ADMIN_NOTIFICATION_SEND_ERROR:", error);
    return fail(req, res, 500, "ADMIN_NOTIFICATION_SEND_FAILED", "Unable to send notification");
  }
}
