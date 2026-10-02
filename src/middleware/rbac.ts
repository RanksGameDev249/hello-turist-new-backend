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

async function hasAnyPermission(userId: string, required: readonly string[]) {
  const rows = await prisma.$queryRaw<Array<{ permission: string }>>`
    SELECT "permission"
    FROM "admin_user_permissions"
    WHERE "user_id" = ${userId}::uuid
      AND "permission" = ANY(${required}::text[])
  `;
  if (rows.length > 0) return true;

  // Backward-compatible bootstrap for ADMIN accounts created after the
  // permissions migration. A real permission set still takes precedence;
  // only an entirely empty set receives the default admin permissions.
  const adminRole = await prisma.$queryRaw<Array<{ role: string }>>`
    SELECT "role"::text AS "role"
    FROM "user_roles"
    WHERE "user_id" = ${userId}::uuid AND "role" = 'ADMIN'
    LIMIT 1
  `;
  if (adminRole.length === 0) return false;

  await prisma.$transaction(async (tx) => {
    for (const permission of ADMIN_PERMISSIONS) {
      await tx.$executeRaw`
        INSERT INTO "admin_user_permissions" ("id", "user_id", "permission", "updated_at")
        VALUES (gen_random_uuid(), ${userId}::uuid, ${permission}, CURRENT_TIMESTAMP)
        ON CONFLICT ("user_id", "permission") DO NOTHING
      `;
    }
  });
  return required.some((permission) => (ADMIN_PERMISSIONS as readonly string[]).includes(permission));
}

export function requirePermission(...required: AdminPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id || required.length === 0) return forbidden(req, res, "unknown");
      if (!(await hasAnyPermission(req.user.id, required))) return forbidden(req, res, required.join(" or "));
      return next();
    } catch (error) {
      console.error("RBAC_PERMISSION_CHECK_ERROR:", error);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: "RBAC_CHECK_FAILED", message: "Unable to verify admin permissions" },
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
