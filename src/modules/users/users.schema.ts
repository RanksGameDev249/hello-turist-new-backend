import { z } from "zod";

const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number");

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    preferredLanguage: z.string().trim().min(2).max(10).optional(),
    profileImageUrl: z.string().url().max(2048).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.phone !== undefined || data.preferredLanguage !== undefined || data.profileImageUrl !== undefined,
    { message: "At least one field is required" }
  );

export const addRoleSchema = z.object({
  role: z.enum(["RIDER", "DRIVER", "GUIDE"]),
});

export const updateRoleSchema = z.object({
  verificationStatus: z.enum(["PENDING", "REJECTED"]),
});
