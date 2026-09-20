import { z } from "zod";

export const guideSearchSchema = z.object({
  serviceCity: z.string().trim().min(2).max(120).optional(),
  languages: z.array(z.string().trim().min(2).max(50)).max(10).optional(),
  specialties: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const assignmentIdSchema = z.string().uuid();

export type GuideSearchInput = z.infer<typeof guideSearchSchema>;
