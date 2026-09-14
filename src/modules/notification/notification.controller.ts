import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { notificationIdSchema } from "./notification.schema";
import {
  deleteNotification,
  getNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    NOTIFICATION_NOT_FOUND: [404, "Notification not found"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

function parseId(req: Request) {
  const parsed = notificationIdSchema.safeParse(req.params);
  return parsed;
}

export async function listNotificationsController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await listNotifications(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function getNotificationController(req: Request, res: Response) {
  const parsed = parseId(req);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid notification id", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await getNotification(req.user!.id, parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function markNotificationReadController(req: Request, res: Response) {
  const parsed = parseId(req);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid notification id", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await markNotificationRead(req.user!.id, parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function markAllNotificationsReadController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await markAllNotificationsRead(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function deleteNotificationController(req: Request, res: Response) {
  const parsed = parseId(req);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid notification id", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await deleteNotification(req.user!.id, parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}
