import { prisma } from "../../core/prisma";
import { NotificationType, Prisma } from "../../generated/prisma/client";
import type { CreateEmergencyIncidentInput, CreateSharedTripInput, CreateTrustedContactInput } from "./safety.schema";

async function notify(userId: string, title: string, body: string, data: Prisma.InputJsonValue) {
  try {
    await prisma.notification.create({ data: { userId, type: NotificationType.SAFETY_ALERT, title, body, data } });
  } catch {
    // Safety state changes must not fail because notification delivery is unavailable.
  }
}

export async function listTrustedContacts(userId: string) {
  return prisma.trustedContact.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
}

export async function createTrustedContact(userId: string, input: CreateTrustedContactInput) {
  return prisma.trustedContact.create({ data: { ownerId: userId, name: input.name, phone: input.phone } });
}

export async function acceptTrustedContactInvitation(userId: string, id: string) {
  const contact = await prisma.trustedContact.findUnique({ where: { id } });
  if (!contact) throw new Error("TRUSTED_CONTACT_NOT_FOUND");
  if (contact.consentStatus !== "PENDING") throw new Error("INVITATION_NOT_PENDING");
  return prisma.trustedContact.update({ where: { id }, data: { consentStatus: "ACCEPTED" } });
}

export async function deleteTrustedContact(userId: string, id: string) {
  const contact = await prisma.trustedContact.findUnique({ where: { id } });
  if (!contact) throw new Error("TRUSTED_CONTACT_NOT_FOUND");
  if (contact.ownerId !== userId) throw new Error("FORBIDDEN");
  await prisma.sharedTrip.updateMany({ where: { contactId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.trustedContact.delete({ where: { id } });
  return { deleted: true };
}

export async function shareTrip(userId: string, rideId: string, input: CreateSharedTripInput) {
  const [ride, contact] = await Promise.all([
    prisma.ride.findUnique({ where: { id: rideId }, select: { id: true, riderId: true } }),
    prisma.trustedContact.findUnique({ where: { id: input.contactId } }),
  ]);
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId) throw new Error("FORBIDDEN");
  if (!contact || contact.ownerId !== userId) throw new Error("TRUSTED_CONTACT_NOT_FOUND");
  if (contact.consentStatus !== "ACCEPTED") throw new Error("TRUSTED_CONTACT_NOT_ACCEPTED");

  const shared = await prisma.sharedTrip.create({
    data: { rideId, contactId: input.contactId, expiresAt: new Date(Date.now() + input.expiresInMinutes * 60_000) },
  });
  await notify(userId, "Trip shared", "Your trip has been shared with a trusted contact.", { event: "TRIP_SHARED", rideId, sharedTripId: shared.id });
  return shared;
}

export async function getSafetyOverview(userId: string) {
  const [contacts, activeIncident] = await Promise.all([
    prisma.trustedContact.count({ where: { ownerId: userId, consentStatus: "ACCEPTED" } }),
    prisma.emergencyIncident.findFirst({ where: { riderId: userId, state: { not: "RESOLVED" } }, orderBy: { createdAt: "desc" } }),
  ]);
  return { trustedContacts: contacts, activeIncident };
}

async function assertIncidentAccess(userId: string, incidentId: string) {
  const incident = await prisma.emergencyIncident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new Error("EMERGENCY_NOT_FOUND");
  if (incident.riderId !== userId) throw new Error("FORBIDDEN");
  return incident;
}

const transitions: Record<string, string[]> = {
  TRIGGERED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["RESPONDER_ASSIGNED", "ESCALATED"],
  RESPONDER_ASSIGNED: ["RESPONDER_EN_ROUTE", "ESCALATED"],
  RESPONDER_EN_ROUTE: ["RESPONDER_ARRIVED", "ESCALATED"],
  RESPONDER_ARRIVED: ["RESOLVED"],
  ESCALATED: ["RESPONDER_ASSIGNED"],
  RESOLVED: [],
};

async function transitionIncident(userId: string, incidentId: string, nextState: "ACKNOWLEDGED" | "ESCALATED" | "RESOLVED") {
  const incident = await assertIncidentAccess(userId, incidentId);
  if (!transitions[incident.state]?.includes(nextState)) throw new Error("INVALID_EMERGENCY_TRANSITION");

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.emergencyIncident.update({
      where: { id: incidentId },
      data: {
        state: nextState,
        ...(nextState === "ACKNOWLEDGED" ? { acknowledgedAt: now } : {}),
        ...(nextState === "ESCALATED" ? { escalatedAt: now } : {}),
        ...(nextState === "RESOLVED" ? { resolvedAt: now } : {}),
      },
    });
    await tx.emergencyEvent.create({
      data: { incidentId, type: `INCIDENT_${nextState}`, payload: { actorUserId: userId, from: incident.state, to: nextState } },
    });
    return updated;
  });
}

export async function createEmergencyIncident(userId: string, input: CreateEmergencyIncidentInput) {
  if (input.rideId) {
    const ride = await prisma.ride.findUnique({ where: { id: input.rideId }, select: { riderId: true } });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (ride.riderId !== userId) throw new Error("FORBIDDEN");
  }

  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.emergencyIncident.create({
      data: {
        riderId: userId,
        rideId: input.rideId,
        category: input.category,
        triggerSource: input.triggerSource,
        state: "TRIGGERED",
        locationSnapshot: input.location as Prisma.InputJsonValue | undefined,
        heartbeatSnapshot: input.heartbeat as Prisma.InputJsonValue | undefined,
      },
    });
    await tx.emergencyEvent.create({
      data: { incidentId: created.id, type: "INCIDENT_TRIGGERED", payload: { actorUserId: userId, category: input.category, triggerSource: input.triggerSource } },
    });
    return created;
  });

  await notify(userId, "Emergency alert triggered", "Your SOS incident has been created. Help can now be coordinated.", { event: "EMERGENCY_TRIGGERED", incidentId: incident.id, rideId: incident.rideId });
  return incident;
}

export async function getEmergencyIncident(userId: string, incidentId: string) {
  const incident = await assertIncidentAccess(userId, incidentId);
  const events = await prisma.emergencyEvent.findMany({ where: { incidentId }, orderBy: { occurredAt: "asc" } });
  const responders = await prisma.emergencyResponder.findMany({ where: { incidentId }, orderBy: { assignedAt: "asc" } });
  return { incident, events, responders };
}

export async function acknowledgeEmergency(userId: string, incidentId: string) {
  return transitionIncident(userId, incidentId, "ACKNOWLEDGED");
}

export async function escalateEmergency(userId: string, incidentId: string) {
  const updated = await transitionIncident(userId, incidentId, "ESCALATED");
  await notify(userId, "Emergency escalated", "Your emergency incident has been escalated.", { event: "EMERGENCY_ESCALATED", incidentId });
  return updated;
}

export async function resolveEmergency(userId: string, incidentId: string) {
  const updated = await transitionIncident(userId, incidentId, "RESOLVED");
  await notify(userId, "Emergency resolved", "Your emergency incident has been marked resolved.", { event: "EMERGENCY_RESOLVED", incidentId });
  return updated;
}
