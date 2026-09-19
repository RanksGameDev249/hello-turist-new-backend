import { z } from "zod";

export const interruptRideSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export const recoverRideSchema = z.object({
  reason: z.string().trim().min(2).max(500).optional(),
  driverId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});

export type InterruptRideInput = z.infer<typeof interruptRideSchema>;
export type RecoverRideInput = z.infer<typeof recoverRideSchema>;
