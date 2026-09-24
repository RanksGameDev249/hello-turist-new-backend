import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";

export type AuditLogInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  requestId?: string;
};

export async function writeAuditLog(input: AuditLogInput) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "audit_logs" ("id", "actor_user_id", "action", "entity_type", "entity_id", "metadata", "request_id")
    VALUES (gen_random_uuid(), ${input.actorUserId ?? null}::uuid, ${input.action}, ${input.entityType}, ${input.entityId ?? null}::uuid, ${input.metadata === undefined ? null : JSON.stringify(input.metadata)}::jsonb, ${input.requestId ?? null})
  `);
}

export async function listAuditLogs(params: { page: number; limit: number; action?: string; entityType?: string; actorUserId?: string }) {
  const offset = (params.page - 1) * params.limit;
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT a.id, a.actor_user_id AS "actorUserId", u.username AS "actorUsername", a.action,
      a.entity_type AS "entityType", a.entity_id AS "entityId", a.metadata,
      a.request_id AS "requestId", a.created_at AS "createdAt"
    FROM "audit_logs" a LEFT JOIN "users" u ON u.id = a.actor_user_id
    WHERE (${params.action ?? null}::text IS NULL OR a.action = ${params.action ?? null})
      AND (${params.entityType ?? null}::text IS NULL OR a.entity_type = ${params.entityType ?? null})
      AND (${params.actorUserId ?? null}::uuid IS NULL OR a.actor_user_id = ${params.actorUserId ?? null}::uuid)
    ORDER BY a.created_at DESC LIMIT ${params.limit} OFFSET ${offset}
  `);
  const countRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM "audit_logs" a
    WHERE (${params.action ?? null}::text IS NULL OR a.action = ${params.action ?? null})
      AND (${params.entityType ?? null}::text IS NULL OR a.entity_type = ${params.entityType ?? null})
      AND (${params.actorUserId ?? null}::uuid IS NULL OR a.actor_user_id = ${params.actorUserId ?? null}::uuid)
  `);
  return { items: rows, total: countRows[0]?.count ?? 0, page: params.page, limit: params.limit };
}

export async function listAdminUsers(params: { page: number; limit: number; status?: string }) {
  const offset = (params.page - 1) * params.limit;
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT u.id, u.name, u.username, u.email, u.status, u.preferred_language AS "preferredLanguage", u.created_at AS "createdAt",
      COALESCE(json_agg(json_build_object('role', r.role, 'verificationStatus', r.verification_status)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
    FROM "users" u LEFT JOIN "user_roles" r ON r.user_id = u.id
    WHERE (${params.status ?? null}::text IS NULL OR u.status::text = ${params.status ?? null})
      AND EXISTS (SELECT 1 FROM "user_roles" ar WHERE ar.user_id = u.id AND ar.role = 'ADMIN')
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT ${params.limit} OFFSET ${offset}
  `);
  const countRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM "users" u
    WHERE (${params.status ?? null}::text IS NULL OR u.status::text = ${params.status ?? null})
  `);
  return { items: rows, total: countRows[0]?.count ?? 0, page: params.page, limit: params.limit };
}
