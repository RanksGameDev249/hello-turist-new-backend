import { Request, Response } from "express";
import { prisma } from "../../core/prisma";
import { ADMIN_PERMISSIONS, getAdminPermissions, setAdminPermissions } from "../../middleware/rbac";
import { writeAuditLog } from "./audit.service";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorResponse(req: Request, res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    requestId: req.requestId,
  });
}

async function assertAdminTarget(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      roles: { some: { role: "ADMIN" } },
    },
    select: { id: true },
  });
  if (!user) throw new Error("ADMIN_TARGET_NOT_FOUND");
}

export async function listAdminPermissions(req: Request, res: Response) {
  const userId = param(req.params.userId);
  if (!userId) return errorResponse(req, res, 400, "INVALID_REQUEST", "userId is required");

  try {
    await assertAdminTarget(userId);
    const permissions = await getAdminPermissions(userId);
    return res.status(200).json({
      success: true,
      data: { userId, permissions, availablePermissions: [...ADMIN_PERMISSIONS] },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_TARGET_NOT_FOUND") {
      return errorResponse(req, res, 404, error.message, "Active admin user not found");
    }
    console.error("ADMIN_PERMISSIONS_LIST_ERROR:", error);
    return errorResponse(req, res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong");
  }
}

export async function updateAdminPermissions(req: Request, res: Response) {
  const userId = param(req.params.userId);
  if (!userId) return errorResponse(req, res, 400, "INVALID_REQUEST", "userId is required");

  const permissions = req.body?.permissions;
  if (!Array.isArray(permissions) || permissions.some((permission) => typeof permission !== "string")) {
    return errorResponse(req, res, 400, "VALIDATION_ERROR", "permissions must be an array of strings");
  }

  try {
    await assertAdminTarget(userId);

    if (userId === req.user!.id && !permissions.includes("admin.permissions.manage")) {
      return errorResponse(req, res, 409, "SELF_LOCKOUT_PREVENTED", "You cannot remove your own admin.permissions.manage permission");
    }

    const updated = await setAdminPermissions(userId, permissions);
    await writeAuditLog({
      actorUserId: req.user!.id,
      action: "ADMIN_PERMISSIONS_UPDATED",
      entityType: "USER",
      entityId: userId,
      metadata: { permissions: updated },
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      data: { userId, permissions: updated },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_TARGET_NOT_FOUND") {
      return errorResponse(req, res, 404, error.message, "Active admin user not found");
    }
    if (error instanceof Error && error.message === "INVALID_PERMISSION") {
      return errorResponse(req, res, 400, error.message, "One or more permissions are not supported", (error as Error & { invalid?: string[] }).invalid);
    }
    console.error("ADMIN_PERMISSIONS_UPDATE_ERROR:", error);
    return errorResponse(req, res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong");
  }
}
