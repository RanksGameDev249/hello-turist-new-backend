import { z } from "zod";

export const createTrustedContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(32),
  inviteeUserId: z.string().uuid().optional(),
});
export const updateTrustedContactSchema = createTrustedContactSchema.partial().refine(v => Object.keys(v).length > 0, "At least one field is required");
export const idSchema = z.object({ id: z.string().uuid() });
export type CreateTrustedContact = z.infer<typeof createTrustedContactSchema>;
export type UpdateTrustedContact = z.infer<typeof updateTrustedContactSchema>;
