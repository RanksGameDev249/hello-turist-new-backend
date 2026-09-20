import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";

const COOLDOWN_MS = Number(process.env.RIDE_SOS_COOLDOWN_MS ?? 60_000);

export async function triggerRideEmergency(userId: string, rideId: string, reason?: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride = await tx.ride.findUnique({ where: { id: rideId }, include: { assignments: { where: { status: "ACCEPTED" }, select: { driverId: true } } } });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    const isRider = ride.riderId === userId;
    const isDriver = ride.assignments.some(a => a.driverId === userId);
    if (!isRider && !isDriver) throw new Error("RIDE_ACCESS_DENIED");
    if (["COMPLETED", "CANCELLED"].includes(String(ride.status))) throw new Error("INVALID_RIDE_STATE");
    const recent = await tx.rideEvent.findFirst({ where: { rideId, type: "SOS_TRIGGERED", createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) } } });
    if (recent) throw new Error("SOS_COOLDOWN");
    const event = await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "SOS_TRIGGERED", payload: { reason: reason ?? "EMERGENCY" } } });
    return { event, riderId: ride.riderId, driverId: ride.assignments[0]?.driverId };
  }).then(async result => {
    const targets = [result.riderId, result.driverId].filter((id): id is string => Boolean(id && id !== userId));
    await Promise.all(targets.map(id => notifyUser(id, "Ride emergency alert", "An emergency alert was triggered for your active ride.", { rideId, eventId: result.event.id, type: "SOS_TRIGGERED" }).catch(() => undefined)));
    return result.event;
  });
}
