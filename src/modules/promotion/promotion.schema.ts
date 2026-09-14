import { z } from "zod";

export const promotionIdSchema = z.object({ id: z.string().uuid() });
export const promotionCodeSchema = z.object({ code: z.string().trim().min(2).max(50) });
export const createPromotionSchema = z.object({
  code: z.string().trim().min(2).max(50).transform(v => v.toUpperCase()),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minRideAmount: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  isActive: z.boolean().default(true),
}).refine(v => v.expiresAt > v.startsAt, { message: "expiresAt must be after startsAt" });

export const updatePromotionSchema = createPromotionSchema.partial().omit({ code: true });
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
