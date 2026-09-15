import { z } from "zod";

export const savedPlaceIdSchema = z.object({
  id: z.string().uuid(),
});

export const createSavedPlaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  placeId: z.string().trim().min(1).max(255).optional(),
});

export const updateSavedPlaceSchema = createSavedPlaceSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export type CreateSavedPlaceInput = z.infer<typeof createSavedPlaceSchema>;
export type UpdateSavedPlaceInput = z.infer<typeof updateSavedPlaceSchema>;
