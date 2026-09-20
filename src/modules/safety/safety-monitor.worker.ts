import { prisma } from "../../core/prisma";
import { NotificationType, Prisma } from "../../generated/prisma/client";
import { purgeExpiredRideRecordings } from "../ride-safety/recording.service";

const intervalMs = Math.max(15_000, Number(process.env.SAFETY_MONITOR_INTERVAL_MS || 60_000));
const staleAfterMs = Math.max(30_000, Number(process.env.RIDE_HEARTBEAT_STALE_MS || 120_000));

async function notifyOnce(userId: string, title: string, body: string, data: Record<string, unknown>) {
  const existing = await prisma.notification.findFirst({ where: { userId, type: NotificationType.SECURITY, data: { path: ["event", "rideId"], equals: data.rideId as string } }, orderBy: { createdAt: "desc" } });
  if (existing && Date.now() - existing.createdAt.getTime() < staleAfterMs) return;
  await prisma.notification.create({ data: { userId, type: NotificationType.SECURITY, title, body, data: data as Prisma.InputJsonValue } });
}

async function monitorActiveRides() {
  const rides = await prisma.ride.findMany({ where: { status: { in: ["ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"] } }, include: { assignments: { where: { status: "ACCEPTED" }, select: { driverId: true } } } });
  const now = Date.now();
  for (const ride of rides) {
    const latest = await prisma.rideLocation.findFirst({ where: { rideId: ride.id }, orderBy: { recordedAt: "desc" } });
    if (latest && now - latest.recordedAt.getTime() <= staleAfterMs) continue;
    const lastAlert = await prisma.rideEvent.findFirst({ where: { rideId: ride.id, type: "LOCATION_RECORDED", payload: { path: ["kind"], equals: "HEARTBEAT_STALE" } }, orderBy: { createdAt: "desc" } });
    if (lastAlert && now - lastAlert.createdAt.getTime() < staleAfterMs) continue;
    const payload = { kind: "HEARTBEAT_STALE", rideId: ride.id, lastLocationAt: latest?.recordedAt?.toISOString() ?? null, staleAfterMs };
    await prisma.rideEvent.create({ data: { rideId: ride.id, type: "LOCATION_RECORDED", payload } });
    await notifyOnce(ride.riderId, "Ride safety check", "We have not received a recent ride location update. Safety monitoring has been alerted.", { event: "HEARTBEAT_STALE", rideId: ride.id });
    for (const assignment of ride.assignments) await notifyOnce(assignment.driverId, "Location update required", "Your ride location update is stale. Please check location permission and connectivity.", { event: "HEARTBEAT_STALE", rideId: ride.id });
  }
}

export function startSafetyMonitoringWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await monitorActiveRides(); } catch (error) { console.error("Safety monitor failed", error); }
    try { await purgeExpiredRideRecordings(); } catch (error) { if (process.env.R2_BUCKET) console.error("Recording retention worker failed", error); }
    finally { running = false; }
  };
  void tick();
  return setInterval(() => void tick(), intervalMs);
}
