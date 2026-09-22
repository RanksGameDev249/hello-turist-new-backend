import { prisma } from "../../core/prisma";
import { GooglePlaceRouteAdapter } from "../place-route/place-route.adapter";

export type RidePricingConfig = {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  currency: "INR";
  updatedAt?: Date;
};

export type FareQuote = {
  currency: "INR";
  distanceMeters: number;
  durationSeconds: number;
  baseFare: number;
  distanceFare: number;
  totalFare: number;
};

const DEFAULT_PRICING: RidePricingConfig = {
  baseFare: 20,
  perKm: 5,
  minimumFare: 20,
  currency: "INR",
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parsePricing(value: unknown): RidePricingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("RIDE_PRICING_CONFIG_MISSING");
  const source = value as Record<string, unknown>;
  const baseFare = Number(source.baseFare);
  const perKm = Number(source.perKm);
  const minimumFare = Number(source.minimumFare);
  if (![baseFare, perKm, minimumFare].every(Number.isFinite) || baseFare < 0 || perKm < 0 || minimumFare < 0) {
    throw new Error("RIDE_PRICING_CONFIG_INVALID");
  }
  return { baseFare, perKm, minimumFare, currency: "INR" };
}

export async function getRidePricing(): Promise<RidePricingConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "RIDE_PRICING" } });
  if (!row) return DEFAULT_PRICING;
  return { ...parsePricing(row.value), updatedAt: row.updatedAt };
}

export async function updateRidePricing(input: Partial<RidePricingConfig>): Promise<RidePricingConfig> {
  const current = await getRidePricing();
  const next = parsePricing({
    baseFare: input.baseFare ?? current.baseFare,
    perKm: input.perKm ?? current.perKm,
    minimumFare: input.minimumFare ?? current.minimumFare,
  });
  const row = await prisma.appSetting.upsert({
    where: { key: "RIDE_PRICING" },
    create: { key: "RIDE_PRICING", value: next },
    update: { value: next },
  });
  return { ...parsePricing(row.value), updatedAt: row.updatedAt };
}

export async function calculateFare(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }): Promise<FareQuote> {
  const { baseFare, perKm, minimumFare } = await getRidePricing();
  const route = await new GooglePlaceRouteAdapter().getRoute(origin, destination);
  const distanceFare = (route.distanceMeters / 1000) * perKm;
  const totalFare = Math.max(minimumFare, baseFare + distanceFare);
  return {
    currency: "INR",
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    baseFare: money(baseFare),
    distanceFare: money(distanceFare),
    totalFare: money(totalFare),
  };
}
