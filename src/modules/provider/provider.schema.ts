import { z } from "zod";

export const driverProfileSchema = z.object({
  bio: z.string().trim().max(1000).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  serviceCity: z.string().trim().min(2).max(120).optional(),
  serviceArea: z.string().trim().max(255).optional(),
  profileImageKey: z.string().trim().max(500).optional(),
  isAvailable: z.boolean().optional(),
});

export const guideProfileSchema = z.object({
  bio: z.string().trim().max(1000).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  serviceCity: z.string().trim().min(2).max(120).optional(),
  profileImageKey: z.string().trim().max(500).optional(),
  languages: z.array(z.string().trim().min(2).max(50)).max(20).optional(),
  specialties: z.array(z.string().trim().min(2).max(100)).max(30).optional(),
  isAvailable: z.boolean().optional(),
});

export const vehicleSchema = z.object({
  make: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  registrationNumber: z.string().trim().min(3).max(30),
  vehicleType: z.enum(["CAR", "SUV", "SEDAN", "HATCHBACK", "VAN", "BUS", "OTHER"]).default("CAR"),
  seatCount: z.number().int().min(1).max(100),
  color: z.string().trim().max(50).optional(),
  imageKey: z.string().trim().max(500).optional(),
});

export const updateVehicleSchema = vehicleSchema.partial();

export type DriverProfileInput = z.infer<typeof driverProfileSchema>;
export type GuideProfileInput = z.infer<typeof guideProfileSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
