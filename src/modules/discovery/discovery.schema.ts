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

export const createCuratedPlaceSchema = z.object({
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
}).superRefine((value, ctx) => {
  if (value.type === "HISTORICAL_PLACE" && !value.history) {
    ctx.addIssue({ code: "custom", path: ["history"], message: "Historical information is required for historical places" });
  }
  if (value.type === "SPONSOR" && !value.sponsorName) {
    ctx.addIssue({ code: "custom", path: ["sponsorName"], message: "Sponsor name is required for sponsors" });
  }
});

export const updateCuratedPlaceSchema = createCuratedPlaceSchema.partial();

export const publicDiscoveryQuerySchema = z.object({
  type: curatedPlaceTypeSchema.optional(),
  city: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateCuratedPlaceInput = z.infer<typeof createCuratedPlaceSchema>;
export type UpdateCuratedPlaceInput = z.infer<typeof updateCuratedPlaceSchema>;
