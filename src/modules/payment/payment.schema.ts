import { z } from "zod";

export const createPaymentSchema = z.object({
  rideId: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  provider: z.string().trim().min(2).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRazorpayOrderSchema = z.object({ rideId: z.string().uuid() });

export const verifyRazorpayPaymentSchema = z.object({
  razorpayPaymentId: z.string().trim().min(1).max(255),
  razorpayOrderId: z.string().trim().min(1).max(255),
  razorpaySignature: z.string().trim().min(1).max(255),
});

export const createRefundSchema = z.object({
  amount: z.number().positive().max(1000000).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const paymentWebhookSchema = z.object({
  providerPaymentId: z.string().trim().min(1).max(255),
  status: z.enum(["AUTHORIZED", "CAPTURED", "FAILED"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
