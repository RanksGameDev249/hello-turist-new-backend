import { z } from "zod";

export const rideIdSchema = z.object({
  id: z.string().uuid(),
});

export const createRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
