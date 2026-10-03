import { z } from "zod";

export const nearbyPartnerPromotionSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(25).default(5),
  limit: z.coerce.number().int().min(1).max(5).default(3),
  types: z.array(z.enum(["HOMESTAY", "HOTEL", "RESTAURANT", "FOOD"])).max(4).optional(),
});

export type NearbyPartnerPromotionInput = z.infer<typeof nearbyPartnerPromotionSchema>;
