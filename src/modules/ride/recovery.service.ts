import { randomUUID } from "node:crypto";
import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";
import type { FareLedgerEntryInput, InterruptRideInput, RecoverRideInput } from "./recovery.schema";

function idempotencyKey(raw: string | undefined, action: string, rideId: string) {
  const value = raw?.trim();
  if (!value) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  return `${action}:${rideId}:${value}`;
}

async function requireAdmin(userId: string) {
  const role = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role: "ADMIN" } } });
  if (!role) throw new Error("ADMIN_REQUIRED");
}

async function requireRideAccess(userId: string, rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { assignments: true } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const driver = ride.assignments.some((a) => a.driverId === userId && a.status === "ACCEPTED");
  if (ride.riderId !== userId && !driver) throw new Error("RIDE_ACCESS_DENIED");
  return ride;
}

export async function interruptRide(userId: string, rideId: string, data: InterruptRideInput, rawIdempotencyKey?: string) {
  const key = idempotencyKey(rawIdempotencyKey, "INTERRUPT", rideId);
  const existing = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM "ride_recovery_actions" WHERE "idempotency_key" = ${key} LIMIT 1
  `;
  if (existing[0]) return existing[0];

  const ride = await requireRideAccess(userId, rideId);
  const accepted = ride.assignments.find((a) => a.driverId === userId && a.status === "ACCEPTED");
  if (!accepted) throw new Error("DRIVER_REQUIRED");
  if (ride.status !== "IN_PROGRESS") throw new Error("INVALID_RIDE_STATE");

  const actionId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`UPDATE "rides" SET "status" = 'INTERRUPTED'::"RideStatus", "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${rideId}::uuid AND "status" = 'IN_PROGRESS'::"RideStatus"`;
    await tx.rideAssignment.update({ where: { id: accepted.id }, data: { status: "REJECTED", rejectedAt: new Date() } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "INTERRUPTED" as never, payload: { reason: data.reason, previousDriverId: userId } } });
    return tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO "ride_recovery_actions" ("id", "ride_id", "actor_user_id", "action", "previous_driver_id", "reason", "status", "idempotency_key", "metadata")
      VALUES (${actionId}::uuid, ${rideId}::uuid, ${userId}::uuid, 'INTERRUPT', ${userId}::uuid, ${data.reason}, 'COMPLETED', ${key}, ${JSON.stringify({ previousStatus: "IN_PROGRESS" })}::jsonb)
      RETURNING *
    `;
  });

  void notifyUser(ride.riderId, "Ride interrupted", "Your ride was interrupted. We are arranging a replacement driver.", { rideId, status: "INTERRUPTED" }).catch(() => undefined);
  return result[0];
}

export async function recoverRide(userId: string, rideId: string, data: RecoverRideInput, rawIdempotencyKey?: string) {
  await requireAdmin(userId);
  const key = idempotencyKey(rawIdempotencyKey, "RECOVER", rideId);
  const existing = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM "ride_recovery_actions" WHERE "idempotency_key" = ${key} LIMIT 1
  `;
  if (existing[0]) return existing[0];

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if ((ride.status as string) !== "INTERRUPTED") throw new Error("INVALID_RIDE_STATE");

  const candidate = data.replacementDriverId
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id FROM "users" u
        JOIN "user_roles" ur ON ur."user_id" = u.id AND ur."role" = 'DRIVER' AND ur."verification_status" = 'APPROVED'
        JOIN "driver_profiles" dp ON dp."user_id" = u.id
        WHERE u.id = ${data.replacementDriverId}::uuid AND u."status" = 'ACTIVE' AND dp."is_available" = true
        LIMIT 1
      `
    : await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id FROM "users" u
        JOIN "user_roles" ur ON ur."user_id" = u.id AND ur."role" = 'DRIVER' AND ur."verification_status" = 'APPROVED'
        JOIN "driver_profiles" dp ON dp."user_id" = u.id
        WHERE u."status" = 'ACTIVE' AND dp."is_available" = true
          AND NOT EXISTS (
            SELECT 1 FROM "ride_assignments" ra WHERE ra."driver_id" = u.id AND ra."status" = 'ACCEPTED'
          )
        ORDER BY dp."updated_at" ASC
        LIMIT 1
      `;
  const replacementDriverId = candidate[0]?.id;
  if (!replacementDriverId) throw new Error("NO_REPLACEMENT_DRIVER_AVAILABLE");

  const actionId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.rideAssignment.create({ data: { rideId, driverId: replacementDriverId, status: "OFFERED" } });
    await tx.$executeRaw`UPDATE "rides" SET "status" = 'ASSIGNED'::"RideStatus", "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${rideId}::uuid AND "status" = 'INTERRUPTED'::"RideStatus"`;
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_ASSIGNED", payload: { driverId: replacementDriverId, recovery: true } } });
    const action = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO "ride_recovery_actions" ("id", "ride_id", "actor_user_id", "action", "replacement_driver_id", "reason", "status", "idempotency_key", "metadata")
      VALUES (${actionId}::uuid, ${rideId}::uuid, ${userId}::uuid, 'REPLACEMENT_DISPATCH', ${replacementDriverId}::uuid, ${data.reason}, 'COMPLETED', ${key}, ${JSON.stringify({ assignmentId: assignment.id })}::jsonb)
      RETURNING *
    `;
    return { assignment, action: action[0] };
  });

  void notifyUser(ride.riderId, "Replacement driver assigned", "A replacement driver has been assigned to continue your ride.", { rideId, driverId: replacementDriverId, status: "ASSIGNED" }).catch(() => undefined);
  void notifyUser(replacementDriverId, "Recovery ride assigned", "You have been assigned a replacement ride.", { rideId, status: "OFFERED" }).catch(() => undefined);
  return result;
}

export async function addFareLedgerEntry(userId: string, rideId: string, data: FareLedgerEntryInput, rawIdempotencyKey?: string) {
  await requireAdmin(userId);
  const key = idempotencyKey(rawIdempotencyKey, "FARE", rideId);
  const existing = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM "ride_fare_ledger" WHERE "idempotency_key" = ${key} LIMIT 1
  `;
  if (existing[0]) return existing[0];
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO "ride_fare_ledger" ("id", "ride_id", "actor_user_id", "entry_type", "amount", "currency", "reference", "metadata", "idempotency_key")
    VALUES (${randomUUID()}::uuid, ${rideId}::uuid, ${userId}::uuid, ${data.entryType}, ${data.amount}, ${data.currency}, ${data.reference ?? null}, ${JSON.stringify(data.metadata ?? {})}::jsonb, ${key})
    RETURNING *
  `;
  return rows[0];
}

export async function listFareLedger(userId: string, rideId: string) {
  await requireRideAccess(userId, rideId);
  return prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM "ride_fare_ledger" WHERE "ride_id" = ${rideId}::uuid ORDER BY "created_at" ASC
  `;
}

export async function listRecoveryActions(userId: string, rideId: string) {
  await requireRideAccess(userId, rideId);
  return prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM "ride_recovery_actions" WHERE "ride_id" = ${rideId}::uuid ORDER BY "created_at" ASC
  `;
}
