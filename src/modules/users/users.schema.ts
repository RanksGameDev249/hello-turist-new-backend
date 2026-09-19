import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  preferredLanguage: z.string().trim().min(2).max(10).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
}).refine((data) => data.name !== undefined || data.preferredLanguage !== undefined || data.avatarUrl !== undefined, { message: "At least one field is required" });

export const addRoleSchema = z.object({ role: z.enum(["RIDER", "DRIVER", "GUIDE"]) });
export const updateRoleSchema = z.object({ verificationStatus: z.enum(["PENDING", "REJECTED"]) });
