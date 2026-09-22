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

// The application owns the live-verification lifecycle. Clients cannot choose
// a third-party provider or mark a live session as completed. Completion is
// performed by an authorized admin after manual review.
export const addLiveSessionSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS"]).default("IN_PROGRESS"),
  startedAt: z.coerce.date().optional(),
});
