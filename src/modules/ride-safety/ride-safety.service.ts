import { prisma } from "../../core/prisma";
import { rideRecordingConsentSchema, type RideRecordingConsentInput } from "./ride-safety.schema";
import { RIDE_RECORDING_POLICY } from "./ride-safety.policy";

export async function recordConsent(userId: string, input: RideRecordingConsentInput) {
  const parsed = rideRecordingConsentSchema.parse(input);
  const ride = await prisma.ride.findUnique({ where: { id: parsed.rideId }, include: { assignments: true } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const isRider = ride.riderId === userId;
  const assignment = ride.assignments.find((a) => a.driverId === userId && ["ACCEPTED", "ARRIVED", "STARTED"].includes(a.status));
  if (!isRider && !assignment) throw new Error("RIDE_ACCESS_DENIED");
  if (!RIDE_RECORDING_POLICY.supportedMedia.every((m) => parsed.media.includes(m as "VIDEO" | "AUDIO"))) throw new Error("RECORDING_MEDIA_REQUIRED");
  await prisma.rideEvent.create({ data: { rideId: parsed.rideId, actorUserId: userId, type: "RECORDING_CONSENT", payload: { consent: true, media: parsed.media } } });
  return { rideId: parsed.rideId, consented: true, media: parsed.media };
}
