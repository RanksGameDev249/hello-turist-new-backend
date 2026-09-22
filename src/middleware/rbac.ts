import { NextFunction, Request, Response } from "express";
import { prisma } from "../core/prisma";

export const ADMIN_PERMISSIONS = [
  "users.read",
  "users.manage",
  "drivers.verify",
  "guides.verify",
  "rides.read",
  "rides.manage",
  "payments.read",
  "payments.refund",
  "emergency.read",
  "emergency.manage",
  "notifications.read",
  "notifications.manage",
  "promotions.read",
  "promotions.manage",
  "support.read",
  "support.manage",
  "pricing.read",
  "pricing.manage",
  "branding.read",
  "branding.manage",
  "remote_ui.read",
  "remote_ui.manage",
  "analytics.read",
  "audit.read",
  "admin.permissions.read",
  "admin.permissions.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

function forbidden(req: Request, res: Response, permission: string) {
  return res.status(403).json({
    success: false,
    data: null,
    error: {
      code: "PERMISSION_REQUIRED",
      message: `Permission required: ${permission}`,
    },
    requestId: req.requestId,
  });
}

export function requirePermission(...required: AdminPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id || required.length === 0) return forbidden(req, res, "unknown");

      const rows = await prisma.$queryRaw<Array<{ permission: string }>>`
        SELECT "permission"
        FROM "admin_user_permissions"
        WHERE "user_id" = ${req.user.id}::uuid
          AND "permission" = ANY(${required}::text[])
      `;

      const granted = new Set(rows.map((row) => row.permission));
      const missing = required.find((permission) => !granted.has(permission));
      if (missing) return forbidden(req, res, missing);

      return next();
    } catch (error) {
      console.error("RBAC_PERMISSION_CHECK_ERROR:", error);
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: "RBAC_CHECK_FAILED",
          message: "Unable to verify admin permissions",
        },
        requestId: req.requestId,
      });
    }
  };
}

export async function getAdminPermissions(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ permission: string }>>`
    SELECT "permission"
    FROM "admin_user_permissions"
    WHERE "user_id" = ${userId}::uuid
    ORDER BY "permission"
  `;
  return rows.map((row) => row.permission);
}

export async function setAdminPermissions(userId: string, permissions: string[]) {
  const unique = [...new Set(permissions)];
  const invalid = unique.filter((permission) => !(ADMIN_PERMISSIONS as readonly string[]).includes(permission));
  if (invalid.length > 0) {
    const error = new Error("INVALID_PERMISSION");
    (error as Error & { invalid?: string[] }).invalid = invalid;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "admin_user_permissions"
      WHERE "user_id" = ${userId}::uuid
    `;

    for (const permission of unique) {
      await tx.$executeRaw`
        INSERT INTO "admin_user_permissions" ("id", "user_id", "permission", "updated_at")
        VALUES (gen_random_uuid(), ${userId}::uuid, ${permission}, CURRENT_TIMESTAMP)
        ON CONFLICT ("user_id", "permission") DO NOTHING
      `;
    }
  });

  return getAdminPermissions(userId);
}
