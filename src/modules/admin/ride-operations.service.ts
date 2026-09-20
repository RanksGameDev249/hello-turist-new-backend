import { prisma } from "../../core/prisma";
import { assignRide } from "../ride/ride.service";

export async function listOperationalRides(input: { page: number; limit: number; status?: string; search?: string }) {
  const where: any = {};
  if (input.status) where.status = input.status as any;
  if (input.search) where.OR = [
    { id: { contains: input.search, mode: "insensitive" } },
    { pickupAddress: { contains: input.search, mode: "insensitive" } },
    { dropoffAddress: { contains: input.search, mode: "insensitive" } },
    { rider: { name: { contains: input.search, mode: "insensitive" } } },
  ];
  const [items, total] = await Promise.all([
    prisma.ride.findMany({ where, include: { rider: { select: { id: true, name: true, username: true, email: true } }, assignments: { include: { driver: { select: { id: true, name: true, username: true } } } }, payment: true }, orderBy: { updatedAt: "desc" }, skip: (input.page - 1) * input.limit, take: input.limit }),
    prisma.ride.count({ where }),
  ]);
  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
}

export async function getOperationalRide(id: string) {
  return prisma.ride.findUnique({ where: { id }, include: { rider: { select: { id: true, name: true, username: true, email: true } }, assignments: { include: { driver: { select: { id: true, name: true, username: true, status: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 100 }, locations: { orderBy: { recordedAt: "desc" }, take: 20 }, payment: { include: { refunds: true } } } });
}

export async function assignOperationalRide(adminUserId: string, rideId: string, driverId: string) {
  return assignRide(adminUserId, rideId, { driverId });
}

export async function cancelOperationalRide(id: string, actorUserId: string, reason: string) {
  const ride = await prisma.ride.findUnique({ where: { id } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (["COMPLETED", "CANCELLED"].includes(ride.status)) throw new Error("INVALID_RIDE_STATE");
  return prisma.$transaction(async tx => {
    const updated = await tx.ride.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason } });
    await tx.rideEvent.create({ data: { rideId: id, actorUserId, type: "CANCELLED", payload: { adminIntervention: true, reason } } });
    return updated;
  });
}
