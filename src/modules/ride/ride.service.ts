import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";
import type { AssignRideInput, CancelRideInput, CreateRideInput, LocationInput, RideEventInput } from "./ride.schema";

const rideInclude = { assignments: { orderBy: { createdAt: "desc" as const }, take: 10 }, events: { orderBy: { createdAt: "desc" as const }, take: 20 }, locations: { orderBy: { recordedAt: "desc" as const }, take: 1 } };

async function getRideForActor(rideId: string, userId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: rideInclude });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const isRider = ride.riderId === userId;
  const isDriver = ride.assignments.some((a) => a.driverId === userId);
  if (!isRider && !isDriver) throw new Error("RIDE_ACCESS_DENIED");
  return ride;
}

async function requireDriverAssignment(userId: string, rideId: string) {
  const a = await prisma.rideAssignment.findFirst({ where: { rideId, driverId: userId }, orderBy: { createdAt: "desc" } });
  if (!a) throw new Error("DRIVER_ASSIGNMENT_NOT_FOUND");
  return a;
}

async function requireApprovedDriver(userId: string) {
  const role = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role: "DRIVER" } } });
  if (!role || role.verificationStatus !== "APPROVED") throw new Error("DRIVER_NOT_VERIFIED");
}

async function transitionRide(rideId: string, userId: string, eventType: "DRIVER_ARRIVING" | "RIDE_STARTED" | "RIDE_COMPLETED", from: string, to: string) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride = await tx.ride.findUnique({ where: { id: rideId }, select: { id: true, riderId: true, status: true } });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (String(ride.status) !== from) throw new Error("INVALID_RIDE_STATE");
    const assignment = await tx.rideAssignment.findFirst({ where: { rideId, driverId: userId, status: "ACCEPTED" }, select: { id: true } });
    if (!assignment) throw new Error("DRIVER_ASSIGNMENT_NOT_ACCEPTED");
    const updated = await tx.ride.update({ where: { id: rideId }, data: { status: to as never, ...(to === "COMPLETED" ? { completedAt: new Date() } : {}) } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: eventType, payload: { source: "ride-lifecycle" } } });
    return updated;
  });
  return result;
}

export async function createRide(userId: string, data: CreateRideInput) {
  const ride = await prisma.$transaction(async (tx) => {
    const c = await tx.ride.create({ data: { riderId: userId, pickupAddress: data.pickupAddress, pickupLatitude: data.pickupLatitude, pickupLongitude: data.pickupLongitude, dropoffAddress: data.dropoffAddress, dropoffLatitude: data.dropoffLatitude, dropoffLongitude: data.dropoffLongitude, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined, notes: data.notes, status: "SEARCHING" }, include: rideInclude });
    await tx.rideEvent.create({ data: { rideId: c.id, actorUserId: userId, type: "CREATED" } });
    await tx.rideEvent.create({ data: { rideId: c.id, actorUserId: userId, type: "SEARCH_STARTED" } });
    return c;
  });
  void notifyUser(userId, "Ride requested", "Your ride request is now searching for a driver.", { rideId: ride.id, status: ride.status }).catch(() => undefined);
  return ride;
}

export async function getRide(userId: string, rideId: string) { return getRideForActor(rideId, userId); }

export async function listRides(userId: string, status?: string, limit = 20, cursor?: string) {
  return prisma.ride.findMany({ where: { riderId: userId, ...(status ? { status: status as any } : {}) }, orderBy: { createdAt: "desc" }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { assignments: { where: { status: "ACCEPTED" }, take: 1 } } });
}

export async function cancelRide(userId: string, rideId: string, data: CancelRideInput) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride = await tx.ride.findUnique({ where: { id: rideId }, include: rideInclude });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (ride.riderId !== userId) throw new Error("RIDE_ACCESS_DENIED");
    if (["COMPLETED", "CANCELLED"].includes(String(ride.status))) throw new Error("INVALID_RIDE_STATE");
    const updated = await tx.ride.update({ where: { id: rideId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: data.reason }, include: rideInclude });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "CANCELLED", payload: { reason: data.reason } } });
    return updated;
  });
  const d = result.assignments.find((a) => a.status === "ACCEPTED");
  if (d) void notifyUser(d.driverId, "Ride cancelled", "The rider cancelled the ride.", { rideId, status: result.status }).catch(() => undefined);
  void notifyUser(userId, "Ride cancelled", "Your ride has been cancelled.", { rideId, status: result.status }).catch(() => undefined);
  return result;
}

export async function assignRide(userId: string, rideId: string, data: AssignRideInput) {
  const admin = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role: "ADMIN" } } });
  if (!admin) throw new Error("ADMIN_REQUIRED");
  await requireApprovedDriver(data.driverId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride = await tx.ride.findUnique({ where: { id: rideId }, select: { id: true, riderId: true, status: true } });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (!["REQUESTED", "SEARCHING"].includes(String(ride.status))) throw new Error("INVALID_RIDE_STATE");
    const active = await tx.rideAssignment.findFirst({ where: { rideId, status: { in: ["OFFERED", "ACCEPTED"] } }, select: { id: true } });
    if (active) throw new Error("RIDE_ALREADY_ASSIGNED");
    const assignment = await tx.rideAssignment.create({ data: { rideId, driverId: data.driverId, status: "OFFERED" } });
    await tx.ride.update({ where: { id: rideId }, data: { status: "ASSIGNED" } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_ASSIGNED", payload: { driverId: data.driverId, assignmentId: assignment.id } } });
    return { assignment, riderId: ride.riderId };
  });
  void notifyUser(result.riderId, "Driver assigned", "A driver has been assigned to your ride.", { rideId, driverId: data.driverId, status: "ASSIGNED" }).catch(() => undefined);
  void notifyUser(data.driverId, "New ride assigned", "You have a new ride assignment. Please accept or reject it.", { rideId, status: result.assignment.status }).catch(() => undefined);
  return result.assignment;
}

export async function acceptRide(userId: string, rideId: string) {
  await requireApprovedDriver(userId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const a = await tx.rideAssignment.findFirst({ where: { rideId, driverId: userId, status: "OFFERED" }, orderBy: { createdAt: "desc" } });
    if (!a) throw new Error("DRIVER_ASSIGNMENT_NOT_FOUND");
    const ride = await tx.ride.findUnique({ where: { id: rideId }, select: { status: true, riderId: true } });
    if (!ride || ride.status !== "ASSIGNED") throw new Error("INVALID_RIDE_STATE");
    const accepted = await tx.rideAssignment.findFirst({ where: { rideId, status: "ACCEPTED", id: { not: a.id } }, select: { id: true } });
    if (accepted) throw new Error("RIDE_ALREADY_ACCEPTED");
    const updated = await tx.rideAssignment.update({ where: { id: a.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_ACCEPTED", payload: { assignmentId: a.id } } });
    return { updated, riderId: ride.riderId };
  });
  void notifyUser(result.riderId, "Driver accepted", "Your driver accepted the ride.", { rideId, status: "ACCEPTED" }).catch(() => undefined);
  return result.updated;
}

export async function rejectRide(userId: string, rideId: string) {
  await requireApprovedDriver(userId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const a = await tx.rideAssignment.findFirst({ where: { rideId, driverId: userId, status: "OFFERED" }, orderBy: { createdAt: "desc" } });
    if (!a) throw new Error("DRIVER_ASSIGNMENT_NOT_FOUND");
    const updated = await tx.rideAssignment.update({ where: { id: a.id }, data: { status: "REJECTED", rejectedAt: new Date() } });
    const remaining = await tx.rideAssignment.count({ where: { rideId, status: { in: ["OFFERED", "ACCEPTED"] } } });
    if (remaining === 0) await tx.ride.update({ where: { id: rideId }, data: { status: "SEARCHING" } });
    await tx.rideEvent.create({ data: { rideId, actorUserId: userId, type: "DRIVER_REJECTED", payload: { assignmentId: a.id } } });
    const ride = await tx.ride.findUnique({ where: { id: rideId }, select: { riderId: true } });
    return { updated, riderId: ride!.riderId };
  });
  void notifyUser(result.riderId, "Driver declined", "The assigned driver declined the ride. We are searching again.", { rideId, status: "SEARCHING" }).catch(() => undefined);
  return result.updated;
}

export async function addLocation(userId: string, rideId: string, data: LocationInput) {
  await requireApprovedDriver(userId);
  const a = await requireDriverAssignment(userId, rideId);
  if (a.status !== "ACCEPTED") throw new Error("DRIVER_ASSIGNMENT_NOT_ACCEPTED");
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, select: { status: true } });
  if (!ride || !["ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"].includes(String(ride.status))) throw new Error("INVALID_RIDE_STATE");
  const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();
  if (recordedAt.getTime() > Date.now() + 60_000) throw new Error("LOCATION_TIMESTAMP_INVALID");
  if (recordedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new Error("LOCATION_TIMESTAMP_TOO_OLD");
  return prisma.rideLocation.create({ data: { rideId, driverId: userId, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, recordedAt } });
}

export async function addRideEvent(userId: string, rideId: string, data: RideEventInput) {
  await requireApprovedDriver(userId);
  const ride = await getRideForActor(rideId, userId);
  if (ride.riderId === userId) throw new Error("DRIVER_REQUIRED");
  const a = await requireDriverAssignment(userId, rideId);
  if (a.status !== "ACCEPTED") throw new Error("DRIVER_ASSIGNMENT_NOT_ACCEPTED");
  const transitions: Record<string, string[]> = { DRIVER_ARRIVING: ["ASSIGNED"], RIDE_STARTED: ["DRIVER_ARRIVING"], RIDE_COMPLETED: ["IN_PROGRESS"] };
  if (!transitions[data.type]?.includes(String(ride.status))) throw new Error("INVALID_RIDE_STATE");
  const next = data.type === "DRIVER_ARRIVING" ? "DRIVER_ARRIVING" : data.type === "RIDE_STARTED" ? "IN_PROGRESS" : "COMPLETED";
  const updated = await transitionRide(rideId, userId, data.type as any, String(ride.status), next);
  const messages: Record<string, [string, string]> = { DRIVER_ARRIVING: ["Driver arriving", "Your driver is on the way."], RIDE_STARTED: ["Ride started", "Your ride has started."], RIDE_COMPLETED: ["Ride completed", "Your ride has been completed."] };
  const [title, body] = messages[data.type];
  void notifyUser(ride.riderId, title, body, { rideId, status: updated.status }).catch(() => undefined);
  return updated;
}

export async function listEvents(userId: string, rideId: string) { await getRideForActor(rideId, userId); return prisma.rideEvent.findMany({ where: { rideId }, orderBy: { createdAt: "asc" } }); }
export async function listLocations(userId: string, rideId: string) { await getRideForActor(rideId, userId); return prisma.rideLocation.findMany({ where: { rideId }, orderBy: { recordedAt: "asc" } }); }

export { requireApprovedGuide };
async function requireApprovedGuide(userId: string) { const role = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role: "GUIDE" } } }); if (!role || role.verificationStatus !== "APPROVED") throw new Error("GUIDE_NOT_VERIFIED"); }
