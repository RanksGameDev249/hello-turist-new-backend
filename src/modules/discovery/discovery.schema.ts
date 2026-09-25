import { z } from "zod";

export const curatedPlaceTypeSchema = z.enum(["SPONSOR", "HOMESTAY", "HISTORICAL_PLACE"]);

export const curatedPlaceIdSchema = z.object({ id: z.string().uuid() });

const optionalTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().max(max).optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().url().max(500).optional());

const coordinate = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") return Number(value);
    return value;
  }, z.number().finite().min(min).max(max));

const nonNegativeNumber = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}, z.number().finite().nonnegative().optional());

// Keep the base object free of refinements so Zod can safely call .partial()
// for PATCH/update requests.
const curatedPlaceBaseSchema = z.object({
  type: curatedPlaceTypeSchema,
  name: z.string().trim().min(2).max(200),
  description: optionalTrimmedString(3000),
  history: optionalTrimmedString(10000),
  address: z.string().trim().min(2).max(500),
  city: optionalTrimmedString(120),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  images: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
  amenities: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  priceFrom: nonNegativeNumber,
  phone: optionalTrimmedString(40),
  website: optionalUrl,
  sponsorName: optionalTrimmedString(200),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const validateCuratedPlaceRules = <T extends z.ZodType>(schema: T) =>
  schema.superRefine((value, ctx) => {
    // Zod 4 exposes the generic schema callback as output<T>. Keep the
    // refinement generic while narrowing only the fields used by these
    // business rules. This preserves the same runtime validation for both
    // create and partial update schemas and avoids relying on Zod internals.
    const data = value as {
      type?: z.infer<typeof curatedPlaceTypeSchema>;
      history?: string;
      sponsorName?: string;
    };

    if (data.type === "HISTORICAL_PLACE" && !data.history) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "Historical information is required for historical places",
      });
    }
    if (data.type === "SPONSOR" && !data.sponsorName) {
      ctx.addIssue({
        code: "custom",
        path: ["sponsorName"],
        message: "Sponsor name is required for sponsors",
      });
    }
  });

export const createCuratedPlaceSchema = validateCuratedPlaceRules(curatedPlaceBaseSchema);

// IMPORTANT: partial() must be called on the unrefined object schema in Zod 4.
// The business rules are applied after partial() so PATCH requests can start
// from a valid partial object without throwing at module initialization.
export const updateCuratedPlaceSchema = validateCuratedPlaceRules(curatedPlaceBaseSchema.partial());

export const publicDiscoveryQuerySchema = z.object({
  type: curatedPlaceTypeSchema.optional(),
  city: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateCuratedPlaceInput = z.infer<typeof createCuratedPlaceSchema>;
export type UpdateCuratedPlaceInput = z.infer<typeof updateCuratedPlaceSchema>;
