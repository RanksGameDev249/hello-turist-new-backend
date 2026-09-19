import { z } from "zod";

export const interruptRideSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export const recoverRideSchema = z.object({
  replacementDriverId: z.string().uuid().optional(),
  reason: z.string().trim().min(2).max(500).default("Ride recovery"),
});

export const fareLedgerEntrySchema = z.object({
  entryType: z.enum(["FARE_ADJUSTMENT", "RECOVERY_CREDIT", "RECOVERY_SURCHARGE", "REFUND_ADJUSTMENT"]),
  amount: z.number().finite().refine((v) => Math.abs(v) <= 1000000, "Amount is too large"),
  currency: z.string().length(3).default("INR"),
  reference: z.string().trim().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type InterruptRideInput = z.infer<typeof interruptRideSchema>;
export type RecoverRideInput = z.infer<typeof recoverRideSchema>;
export type FareLedgerEntryInput = z.infer<typeof fareLedgerEntrySchema>;
