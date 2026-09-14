import { z } from "zod";

const coordinate = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const searchPlacesSchema = z.object({
  query: z.string().trim().min(1).max(200),
  location: coordinate.optional(),
});

export const routeSchema = z.object({
  origin: coordinate,
  destination: coordinate,
});

export { coordinate };
