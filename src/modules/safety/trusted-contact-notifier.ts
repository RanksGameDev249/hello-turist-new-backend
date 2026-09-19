import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";

export async function notifyAcceptedTrustedContactsForRide(rideId: string, event: "RIDE_STARTED" | "EMERGENCY_TRIGGERED", extra?: Record<string, unknown>) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: { id: true, riderId: true, pickupAddress: true, dropoffAddress: true },
  });
  if (!ride) return { notified: 0 };

  const contacts = await prisma.trustedContact.findMany({
    where: { ownerId: ride.riderId, consentStatus: "ACCEPTED", inviteeUserId: { not: null } },
    select: { inviteeUserId: true },
  });

  const recipients = [...new Set(contacts.map((c) => c.inviteeUserId).filter((id): id is string => Boolean(id)))];
  const title = event === "RIDE_STARTED" ? "Ride started" : "Emergency alert";
  const body = event === "RIDE_STARTED"
    ? `A trusted contact's ride has started from ${ride.pickupAddress} to ${ride.dropoffAddress}.`
    : "A trusted contact has triggered an emergency alert. Please check the trip and contact them if needed.";

  await Promise.allSettled(
    recipients.map((userId) => notifyUser(userId, title, body, { event, rideId, ...extra })),
  );
  return { notified: recipients.length };
}

export async function notifyTrustedContactsForEmergency(incidentId: string) {
  const incident = await prisma.emergencyIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, riderId: true, rideId: true, category: true, triggerSource: true },
  });
  if (!incident) return { notified: 0 };

  const contacts = await prisma.trustedContact.findMany({
    where: { ownerId: incident.riderId, consentStatus: "ACCEPTED", inviteeUserId: { not: null } },
    select: { inviteeUserId: true },
  });
  const recipients = [...new Set(contacts.map((c) => c.inviteeUserId).filter((id): id is string => Boolean(id)))];

  await Promise.allSettled(
    recipients.map((userId) => notifyUser(userId, "Emergency alert", "A trusted contact has triggered an emergency alert.", {
      event: "EMERGENCY_TRIGGERED",
      incidentId: incident.id,
      rideId: incident.rideId,
      category: incident.category,
      triggerSource: incident.triggerSource,
    })),
  );
  return { notified: recipients.length };
}
