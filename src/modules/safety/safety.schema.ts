import { z } from "zod";

export const createTrustedContactSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20),
});

export const createSharedTripSchema = z.object({
  contactId: z.string().uuid(),
  expiresInMinutes: z.number().int().min(1).max(7 * 24 * 60).default(24 * 60),
});

export const createEmergencyIncidentSchema = z.object({
  rideId: z.string().uuid().optional(),
  category: z.string().min(2).max(50).default("SOS"),
  triggerSource: z.string().min(2).max(50).default("ANDROID_APP"),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
  }).optional(),
  heartbeat: z.record(z.string(), z.unknown()).optional(),
});
