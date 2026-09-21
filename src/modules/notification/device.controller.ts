import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { notificationDeviceSchema, notificationDeviceTokenSchema } from "./device.schema";
import { listNotificationDevices, registerNotificationDevice, unregisterNotificationDevice } from "./device.service";

export async function registerNotificationDeviceController(req: Request, res: Response) {
  const parsed = notificationDeviceSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid notification device", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await registerNotificationDevice(req.user!.id, parsed.data));
  } catch (error) {
    return errorResponse(res, req.requestId, 500, "NOTIFICATION_DEVICE_REGISTRATION_FAILED", error instanceof Error ? error.message : "Failed to register notification device");
  }
}

export async function unregisterNotificationDeviceController(req: Request, res: Response) {
  const parsed = notificationDeviceTokenSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid notification device token", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await unregisterNotificationDevice(req.user!.id, parsed.data.token));
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = code === "NOTIFICATION_DEVICE_NOT_FOUND" ? 404 : 500;
    return errorResponse(res, req.requestId, status, code, status === 404 ? "Notification device not found" : "Failed to unregister notification device");
  }
}

export async function listNotificationDevicesController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await listNotificationDevices(req.user!.id));
  } catch (error) {
    return errorResponse(res, req.requestId, 500, "NOTIFICATION_DEVICE_LIST_FAILED", error instanceof Error ? error.message : "Failed to list notification devices");
  }
}
