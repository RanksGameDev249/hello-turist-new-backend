import { z } from "zod";

export const createVerificationRequestSchema = z.object({
  role: z.enum(["DRIVER", "GUIDE"]),
});

export const addVerificationDocumentSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
  privateObjectKey: z.string().trim().min(1).max(500),
  checksum: z.string().trim().min(8).max(256).optional(),
  expiryDate: z.coerce.date().optional(),
});

export const addLiveSessionSchema = z.object({
  providerReference: z.string().trim().min(1).max(255),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).default("PENDING"),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
