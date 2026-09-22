import { z } from "zod";

export const curatedPlaceTypeSchema = z.enum(["SPONSOR", "HOMESTAY", "HISTORICAL_PLACE"]);

export const curatedPlaceIdSchema = z.object({ id: z.string().uuid() });

export const createCuratedPlaceSchema = z.object({
  type: curatedPlaceTypeSchema,
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(3000).optional(),
  history: z.string().trim().max(10000).optional(),
  address: z.string().trim().min(2).max(500),
  city: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  images: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
  amenities: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  priceFrom: z.number().nonnegative().optional(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().url().max(500).optional(),
  sponsorName: z.string().trim().max(200).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateCuratedPlaceSchema = createCuratedPlaceSchema.partial();

export const publicDiscoveryQuerySchema = z.object({
  type: curatedPlaceTypeSchema.optional(),
  city: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateCuratedPlaceInput = z.infer<typeof createCuratedPlaceSchema>;
export type UpdateCuratedPlaceInput = z.infer<typeof updateCuratedPlaceSchema>;
