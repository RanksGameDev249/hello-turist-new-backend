import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";
import type { InterruptRideInput, RecoverRideInput } from "./recovery.schema";

async function requireActor(rideId: string, userId: string) {
  const [ride, admin] = await Promise.all([
    prisma.ride.findUnique({
      where: { id: rideId },
      include: { assignments: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.userRoleAssignment.findUnique({
      where: { userId_role: { userId, role: "ADMIN" } },
      select: { id: true },
    }),
  ]);

  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const isRider = ride.riderId === userId;
  const isAssignedDriver = ride.assignments.some((a) => a.driverId === userId);
  if (!admin && !isRider && !isAssignedDriver) throw new Error("RIDE_ACCESS_DENIED");

  return { ride, isAdmin: Boolean(admin), isRider, isAssignedDriver };
}

async function requireApprovedDriver(driverId: string) {
  const role = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId: driverId, role: "DRIVER" } },
    select: { verificationStatus: true },
  });
  if (!role || role.verificationStatus !== "APPROVED") throw new Error("DRIVER_NOT_VERIFIED");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: driverId },
    select: { isAvailable: true },
  });
  if (!profile || !profile.isAvailable) throw new Error("DRIVER_NOT_AVAILABLE");
}

export async function interruptRide(userId: string, rideId: string, data: InterruptRideInput) {
  const { ride, isAdmin } = await requireActor(rideId, userId);
  if (ride.status !== "IN_PROGRESS") throw new Error("INVALID_RIDE_STATE");

  const accepted = ride.assignments.find((a) => a.status === "ACCEPTED");
  if (!isAdmin && ride.riderId !== userId && accepted?.driverId !== userId) {
    throw new Error("RIDE_ACCESS_DENIED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const current = await tx.ride.findUnique({ where: { id: rideId }, select: { status: true } });
    if (!current) throw new Error("RIDE_NOT_FOUND");
    if (current.status !== "IN_PROGRESS") throw new Error("INVALID_RIDE_STATE");

    await tx.ride.update({ where: { id: rideId }, data: { status: "INTERRUPTED" as never } });
    await tx.$executeRaw`
      INSERT INTO "ride_events" ("id", "ride_id", "actor_user_id", "type", "payload", "created_at")
      VALUES (gen_random_uuid(), ${rideId}::uuid, ${userId}::uuid, 'INTERRUPTED'::"RideEventType", ${JSON.stringify({ reason: data.reason })}::jsonb, NOW())
    `;
  });

  void notifyUser(ride.riderId, "Ride interrupted", "Your ride was interrupted. We are arranging a replacement driver.", {
    rideId,
    status: "INTERRUPTED",
    reason: data.reason,
  }).catch(() => undefined);

  if (accepted && accepted.driverId !== userId) {
    void notifyUser(accepted.driverId, "Ride interrupted", "This ride has been interrupted and recovery is being arranged.", {
      rideId,
      status: "INTERRUPTED",
    }).catch(() => undefined);
  }

  return prisma.ride.findUnique({
    where: { id: rideId },
    include: { assignments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
}

export async function recoverRide(userId: string, rideId: string, data: RecoverRideInput) {
  const { ride, isAdmin } = await requireActor(rideId, userId);
  if (ride.status !== "INTERRUPTED") throw new Error("INVALID_RIDE_STATE");

  const excludedDriverIds = ride.assignments.map((a) => a.driverId);
  const idempotencyKey = data.idempotencyKey?.trim();

  if (idempotencyKey) {
    const existing = await prisma.$queryRaw<Array<{ id: string; driver_id: string }>>`
      SELECT "id", "payload"->>'driverId' AS driver_id
      FROM "ride_events"
      WHERE "ride_id"=${rideId}::uuid
        AND "type"='DRIVER_ASSIGNED'::"RideEventType"
        AND "payload"->>'recovery'='true'
        AND "payload"->>'idempotencyKey'=${idempotencyKey}
      ORDER BY "created_at" DESC
      LIMIT 1
    `;
    if (existing[0]) {
      return prisma.rideAssignment.findFirst({ where: { id: existing[0].id }, include: { ride: true } }).catch(() => null);
    }
  }

  let driverId = data.driverId;
  if (driverId) {
    if (excludedDriverIds.includes(driverId)) throw new Error("DRIVER_ALREADY_ASSIGNED");
    await requireApprovedDriver(driverId);
  } else {
    const candidates = await prisma.userRoleAssignment.findMany({
      where: {
        role: "DRIVER",
        verificationStatus: "APPROVED",
        user: {
          status: "ACTIVE",
          ...(excludedDriverIds.length ? { id: { notIn: excludedDriverIds } } : {}),
          driverProfile: { isAvailable: true },
        },
      },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    driverId = candidates[0]?.userId;
  }

  if (!driverId) throw new Error("NO_REPLACEMENT_DRIVER_AVAILABLE");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;

    const current = await tx.ride.findUnique({
      where: { id: rideId },
      include: { assignments: { orderBy: { createdAt: "desc" } } },
    });
    if (!current) throw new Error("RIDE_NOT_FOUND");
    if (current.status !== "INTERRUPTED") throw new Error("INVALID_RIDE_STATE");

    if (idempotencyKey) {
      const existing = await tx.$queryRaw<Array<{ assignment_id: string }>>`
        SELECT "id" AS assignment_id
        FROM "ride_assignments"
        WHERE "ride_id"=${rideId}::uuid
          AND "created_at" >= NOW() - INTERVAL '24 hours'
          AND "id" IN (
            SELECT ("payload"->>'assignmentId')::uuid
            FROM "ride_events"
            WHERE "ride_id"=${rideId}::uuid
              AND "type"='DRIVER_ASSIGNED'::"RideEventType"
              AND "payload"->>'recovery'='true'
              AND "payload"->>'idempotencyKey'=${idempotencyKey}
          )
        LIMIT 1
      `;
      if (existing[0]) {
        return tx.rideAssignment.findUnique({ where: { id: existing[0].assignment_id } });
      }
    }

    const oldAccepted = current.assignments.find((a) => a.status === "ACCEPTED");
    if (oldAccepted) {
      await tx.rideAssignment.update({
        where: { id: oldAccepted.id },
        data: { status: "REJECTED", rejectedAt: new Date() },
      });
    }

    const assignment = await tx.rideAssignment.create({
      data: { rideId, driverId: driverId!, status: "OFFERED" },
    });

    await tx.ride.update({ where: { id: rideId }, data: { status: "ASSIGNED" as never } });
    await tx.rideEvent.create({
      data: {
        rideId,
        actorUserId: userId,
        type: "DRIVER_ASSIGNED",
        payload: {
          recovery: true,
          assignmentId: assignment.id,
          driverId: driverId!,
          previousDriverId: oldAccepted?.driverId ?? null,
          reason: data.reason ?? "Ride recovery",
          idempotencyKey: idempotencyKey ?? null,
        },
      },
    });

    return assignment;
  });

  void notifyUser(ride.riderId, "Replacement driver assigned", "A replacement driver has been assigned to your ride.", {
    rideId,
    driverId,
    status: "ASSIGNED",
    recovery: true,
  }).catch(() => undefined);
  void notifyUser(driverId, "Replacement ride assigned", "You have been assigned a replacement ride. Please accept it.", {
    rideId,
    status: "OFFERED",
    recovery: true,
  }).catch(() => undefined);

  return result;
}
