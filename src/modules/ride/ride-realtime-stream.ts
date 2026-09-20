import { prisma } from "../../core/prisma";
import { subscribeRideLocation as subscribe } from "./ride-realtime.service";

export async function getRide(rideId: string, userId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { assignments: { where: { status: "ACCEPTED" }, select: { driverId: true } } } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId && !ride.assignments.some(a => a.driverId === userId)) throw new Error("RIDE_ACCESS_DENIED");
  return ride;
}

export function subscribeRideLocation(rideId: string, listener: Parameters<typeof subscribe>[1]) {
  return subscribe(rideId, listener);
}
