import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";
import type { AssignRideInput, CancelRideInput, CreateRideInput, LocationInput, RideEventInput } from "./ride.schema";

const rideInclude = {
  assignments: { orderBy: { createdAt: "desc" as const }, take: 10 },
  events: { orderBy: { createdAt: "desc" as const }, take: 20 },
  locations: { orderBy: { recordedAt: "desc" as const }, take: 1 },
};

async function getRideForActor(rideId: string, userId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: rideInclude });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const isRider = ride.riderId === userId;
  const isDriver = ride.assignments.some((a) => a.driverId === userId);
  if (!isRider && !isDriver) throw new Error("RIDE_ACCESS_DENIED");
  return ride;
}

export async function createRide(userId: string, data: CreateRideInput) {
  const ride = await prisma.$transaction(async (tx) => {
    const created = await tx.ride.create({
      data: {
        riderId: userId,
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        dropoffAddress: data.dropoffAddress,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        notes: data.notes,
        status: "SEARCHING",
      },
      include: rideInclude,
    });
    await tx.rideEvent.create({ data: { rideId: created.id, actorUserId: userId, type: "CREATED" } });
    await tx.rideEvent.create({ data: { rideId: created.id, actorUserId: userId, type: "SEARCH_STARTED" } });
    return created;
  });

  void notifyUser(userId, "Ride requested", "Your ride request is now searching for a driver.", { rideId: ride.id, status: ride.status }).catch(() => undefined);
  return ride;
}

export async function getRide(userId: string, rideId: string) {
  return getRideForActor(rideId, userId);
}

export async function listRides(userId: string, status?: string, limit = 20, cursor?: string) {
  return prisma.ride.findMany({
    where: { riderId: userId, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { assignments: { where: { status: "ACCEPTED" }, take: 1 } },
  });
}

export async function cancelRide(userId: string, rideId: string, data: CancelRideInput) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId) throw new Error("RIDE_ACCESS_DENIED");
  if (["COMPLETED", "CANCELLED"].includes(ride.status)) throw new Error("INVALID_RIDE_STATE");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ride.update({ where: { id: rideId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: data.reason }, include: rideInclude });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "CANCELLED", payload: { reason: data.reason } } });
    return result;
  });

  const acceptedDriver = updated.assignments.find((a) => a.status === "ACCEPTED");
  if (acceptedDriver) {
    void notifyUser(acceptedDriver.driverId, "Ride cancelled", "The rider cancelled the ride.", { rideId, status: updated.status }).catch(() => undefined);
  }
  void notifyUser(userId, "Ride cancelled", "Your ride has been cancelled.", { rideId, status: updated.status }).catch(() => undefined);
  return updated;
}

export async function assignRide(userId: string, rideId: string, data: AssignRideInput) {
  const role = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role: "ADMIN" } } });
  if (!role) throw new Error("ADMIN_REQUIRED");
  const driverRole = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId: data.driverId, role: "DRIVER" } } });
  if (!driverRole || driverRole.verificationStatus !== "APPROVED") throw new Error("DRIVER_NOT_VERIFIED");
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (!["REQUESTED", "SEARCHING"].includes(ride.status)) throw new Error("INVALID_RIDE_STATE");

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.rideAssignment.create({ data: { rideId, driverId: data.driverId, status: "OFFERED" } });
    await tx.ride.update({ where: { id: rideId }, data: { status: "ASSIGNED" } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_ASSIGNED", payload: { driverId: data.driverId } } });
    return created;
  });

  void notifyUser(ride.riderId, "Driver assigned", "A driver has been assigned to your ride.", { rideId, driverId: data.driverId, status: "ASSIGNED" }).catch(() => undefined);
  void notifyUser(data.driverId, "New ride assigned", "You have a new ride assignment. Please accept or reject it.", { rideId, status: assignment.status }).catch(() => undefined);
  return assignment;
}

async function requireDriverAssignment(userId: string, rideId: string) {
  const assignment = await prisma.rideAssignment.findFirst({ where: { rideId, driverId: userId }, orderBy: { createdAt: "desc" } });
  if (!assignment) throw new Error("DRIVER_ASSIGNMENT_NOT_FOUND");
  return assignment;
}

export async function acceptRide(userId: string, rideId: string) {
  const assignment = await requireDriverAssignment(userId, rideId);
  if (assignment.status !== "OFFERED") throw new Error("INVALID_ASSIGNMENT_STATE");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.rideAssignment.update({ where: { id: assignment.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_ACCEPTED" } });
    return result;
  });

  const ride = await prisma.ride.findUnique({ where: { id: rideId }, select: { riderId: true } });
  if (ride) void notifyUser(ride.riderId, "Driver accepted", "Your driver accepted the ride.", { rideId, status: updated.status }).catch(() => undefined);
  return updated;
}

export async function rejectRide(userId: string, rideId: string) {
  const assignment = await requireDriverAssignment(userId, rideId);
  if (assignment.status !== "OFFERED") throw new Error("INVALID_ASSIGNMENT_STATE");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.rideAssignment.update({ where: { id: assignment.id }, data: { status: "REJECTED", rejectedAt: new Date() } });
    await tx.ride.update({ where: { id: rideId }, data: { status: "SEARCHING" } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_REJECTED" } });
    return result;
  });

  const ride = await prisma.ride.findUnique({ where: { id: rideId }, select: { riderId: true } });
  if (ride) void notifyUser(ride.riderId, "Driver declined", "The assigned driver declined your ride. We are searching again.", { rideId, status: "SEARCHING" }).catch(() => undefined);
  return updated;
}

export async function addLocation(userId: string, rideId: string, data: LocationInput) {
  const assignment = await requireDriverAssignment(userId, rideId);
  if (assignment.status !== "ACCEPTED") throw new Error("DRIVER_ASSIGNMENT_NOT_ACCEPTED");
  return prisma.rideLocation.create({ data: { rideId, driverId: userId, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date() } });
}

export async function addRideEvent(userId: string, rideId: string, data: RideEventInput) {
  const ride = await getRideForActor(rideId, userId);
  if (ride.riderId === userId) throw new Error("DRIVER_REQUIRED");
  const assignment = await requireDriverAssignment(userId, rideId);
  if (assignment.status !== "ACCEPTED") throw new Error("DRIVER_ASSIGNMENT_NOT_ACCEPTED");
  const transitions: Record<string, string[]> = {
    DRIVER_ARRIVING: ["ASSIGNED"],
    RIDE_STARTED: ["DRIVER_ARRIVING"],
    RIDE_COMPLETED: ["IN_PROGRESS"],
  };
  if (!transitions[data.type].includes(ride.status)) throw new Error("INVALID_RIDE_STATE");
  const next = data.type === "DRIVER_ARRIVING" ? "DRIVER_ARRIVING" : data.type === "RIDE_STARTED" ? "IN_PROGRESS" : "COMPLETED";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ride.update({ where: { id: rideId }, data: { status: next as any, ...(next === "COMPLETED" ? { completedAt: new Date() } : {}) } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: data.type, payload: data.payload as any } });
    return result;
  });

  const messages: Record<string, [string, string]> = {
    DRIVER_ARRIVING: ["Driver arriving", "Your driver is on the way."],
    RIDE_STARTED: ["Ride started", "Your ride has started."],
    RIDE_COMPLETED: ["Ride completed", "Your ride has been completed."],
  };
  const [title, body] = messages[data.type];
  void notifyUser(ride.riderId, title, body, { rideId, status: updated.status }).catch(() => undefined);
  return updated;
}

export async function listEvents(userId: string, rideId: string) {
  await getRideForActor(rideId, userId);
  return prisma.rideEvent.findMany({ where: { rideId }, orderBy: { createdAt: "asc" } });
}

export async function listLocations(userId: string, rideId: string) {
  await getRideForActor(rideId, userId);
  return prisma.rideLocation.findMany({ where: { rideId }, orderBy: { recordedAt: "asc" } });
}
