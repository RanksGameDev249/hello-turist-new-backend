import { TrustedContactConsentStatus, NotificationType } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";
import { createNotification } from "../notification/notification.service";
import type { CreateTrustedContact, UpdateTrustedContact } from "./trusted-contact.schema";

async function getOwned(id: string, ownerId: string) {
  const contact = await prisma.trustedContact.findFirst({ where: { id, ownerId } });
  if (!contact) throw new Error("TRUSTED_CONTACT_NOT_FOUND");
  return contact;
}

export async function listTrustedContacts(ownerId: string) {
  return prisma.trustedContact.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
}

export async function createTrustedContact(ownerId: string, input: CreateTrustedContact) {
  if (input.inviteeUserId === ownerId) throw new Error("SELF_TRUSTED_CONTACT");
  const existing = await prisma.trustedContact.findFirst({ where: { ownerId, phone: input.phone } });
  if (existing) throw new Error("TRUSTED_CONTACT_EXISTS");
  const contact = await prisma.trustedContact.create({ data: { ownerId, name: input.name, phone: input.phone, inviteeUserId: input.inviteeUserId, consentStatus: TrustedContactConsentStatus.PENDING } });
  if (input.inviteeUserId) await createNotification(input.inviteeUserId, { type: NotificationType.SECURITY, title: "Trusted contact invitation", body: "You have been invited to become a trusted contact.", data: { kind: "TRUSTED_CONTACT_INVITE", trustedContactId: contact.id, ownerId } });
  return contact;
}

export async function updateTrustedContact(ownerId: string, id: string, input: UpdateTrustedContact) {
  await getOwned(id, ownerId);
  return prisma.trustedContact.update({ where: { id }, data: input });
}

export async function deleteTrustedContact(ownerId: string, id: string) {
  await getOwned(id, ownerId);
  await prisma.trustedContact.delete({ where: { id } });
  return { id };
}

export async function acceptTrustedContact(userId: string, id: string) {
  const contact = await prisma.trustedContact.findFirst({ where: { id, inviteeUserId: userId, consentStatus: TrustedContactConsentStatus.PENDING } });
  if (!contact) throw new Error("TRUSTED_CONTACT_INVITE_NOT_FOUND");
  const updated = await prisma.trustedContact.update({ where: { id }, data: { consentStatus: TrustedContactConsentStatus.ACCEPTED } });
  await createNotification(contact.ownerId, { type: NotificationType.SECURITY, title: "Trusted contact accepted", body: `${contact.name} accepted your trusted contact invitation.`, data: { kind: "TRUSTED_CONTACT_ACCEPTED", trustedContactId: id } });
  return updated;
}

export async function revokeTrustedContact(userId: string, id: string) {
  const contact = await prisma.trustedContact.findFirst({ where: { id, OR: [{ ownerId: userId }, { inviteeUserId: userId }] } });
  if (!contact) throw new Error("TRUSTED_CONTACT_NOT_FOUND");
  const updated = await prisma.trustedContact.update({ where: { id }, data: { consentStatus: TrustedContactConsentStatus.REVOKED } });
  const notifyUserId = contact.ownerId === userId ? contact.inviteeUserId : contact.ownerId;
  if (notifyUserId) await createNotification(notifyUserId, { type: NotificationType.SECURITY, title: "Trusted contact revoked", body: "A trusted contact relationship was revoked.", data: { kind: "TRUSTED_CONTACT_REVOKED", trustedContactId: id } });
  return updated;
}

export async function notifyTrustedContactsForRide(rideId: string, ownerId: string, kind: "RIDE_STARTED" | "SOS", message: string) {
  const contacts = await prisma.trustedContact.findMany({ where: { ownerId, consentStatus: TrustedContactConsentStatus.ACCEPTED } });
  await Promise.all(contacts.filter(c => c.inviteeUserId).map(c => createNotification(c.inviteeUserId!, { type: NotificationType.SECURITY, title: kind === "SOS" ? "Emergency alert" : "Ride started", body: message, data: { kind, rideId, trustedContactId: c.id } })));
  return { notifiedCount: contacts.filter(c => c.inviteeUserId).length };
}
