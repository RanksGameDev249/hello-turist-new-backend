import { prisma } from "../../core/prisma";
import { GooglePlaceRouteAdapter, type Coordinate, type RouteResult } from "../place-route/place-route.adapter";

export type RouteStop = {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
};

export type RidePricingConfig = {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  currency: "INR";
  updatedAt?: Date;
};

export type GuidePricingConfig = {
  hourlyRate: number;
  minimumHours: number;
  currency: "INR";
  updatedAt?: Date;
};

export type TaxConfig = {
  rideGstRate: number;
  guideGstRate: number;
  updatedAt?: Date;
};

export type FareQuote = {
  currency: "INR";
  distanceMeters: number;
  durationSeconds: number;
  baseFare: number;
  distanceFare: number;
  rideFare: number;
  guideFare: number;
  guideHours: number;
  subtotal: number;
  rideGstRate: number;
  rideGstAmount: number;
  guideGstRate: number;
  guideGstAmount: number;
  gstAmount: number;
  totalFare: number;
  stops: Array<{ name: string; distanceMeters: number; durationSeconds: number }>;
};

const DEFAULT_PRICING: RidePricingConfig = { baseFare: 20, perKm: 5, minimumFare: 20, currency: "INR" };
const DEFAULT_GUIDE_PRICING: GuidePricingConfig = { hourlyRate: 300, minimumHours: 1, currency: "INR" };
const DEFAULT_TAX: TaxConfig = { rideGstRate: 5, guideGstRate: 18 };

function money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

function parsePricing(value: unknown): RidePricingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("RIDE_PRICING_CONFIG_MISSING");
  const source = value as Record<string, unknown>;
  const baseFare = Number(source.baseFare), perKm = Number(source.perKm), minimumFare = Number(source.minimumFare);
  if (![baseFare, perKm, minimumFare].every(Number.isFinite) || baseFare < 0 || perKm < 0 || minimumFare < 0) throw new Error("RIDE_PRICING_CONFIG_INVALID");
  return { baseFare, perKm, minimumFare, currency: "INR" };
}

function parseGuidePricing(value: unknown): GuidePricingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("GUIDE_PRICING_CONFIG_INVALID");
  const source = value as Record<string, unknown>;
  const hourlyRate = Number(source.hourlyRate), minimumHours = Number(source.minimumHours ?? 1);
  if (![hourlyRate, minimumHours].every(Number.isFinite) || hourlyRate < 0 || minimumHours <= 0) throw new Error("GUIDE_PRICING_CONFIG_INVALID");
  return { hourlyRate, minimumHours, currency: "INR" };
}

function parseTax(value: unknown): TaxConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("TAX_CONFIG_INVALID");
  const source = value as Record<string, unknown>;
  const rideGstRate = Number(source.rideGstRate ?? DEFAULT_TAX.rideGstRate);
  const guideGstRate = Number(source.guideGstRate ?? DEFAULT_TAX.guideGstRate);
  if (![rideGstRate, guideGstRate].every(Number.isFinite) || rideGstRate < 0 || guideGstRate < 0 || rideGstRate > 100 || guideGstRate > 100) throw new Error("TAX_CONFIG_INVALID");
  return { rideGstRate, guideGstRate };
}

export async function getRidePricing(): Promise<RidePricingConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "RIDE_PRICING" } });
  if (!row) return DEFAULT_PRICING;
  return { ...parsePricing(row.value), updatedAt: row.updatedAt };
}

export async function getGuidePricing(): Promise<GuidePricingConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "GUIDE_PRICING" } });
  if (!row) return DEFAULT_GUIDE_PRICING;
  return { ...parseGuidePricing(row.value), updatedAt: row.updatedAt };
}

export async function getTaxConfig(): Promise<TaxConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "GST_CONFIG" } });
  if (!row) return DEFAULT_TAX;
  return { ...parseTax(row.value), updatedAt: row.updatedAt };
}

export async function updateRidePricing(input: Partial<RidePricingConfig>): Promise<RidePricingConfig> {
  const current = await getRidePricing();
  const next = parsePricing({ baseFare: input.baseFare ?? current.baseFare, perKm: input.perKm ?? current.perKm, minimumFare: input.minimumFare ?? current.minimumFare });
  const row = await prisma.appSetting.upsert({ where: { key: "RIDE_PRICING" }, create: { key: "RIDE_PRICING", value: next }, update: { value: next } });
  return { ...parsePricing(row.value), updatedAt: row.updatedAt };
}

export async function updateGuidePricing(input: Partial<GuidePricingConfig>): Promise<GuidePricingConfig> {
  const current = await getGuidePricing();
  const next = parseGuidePricing({ hourlyRate: input.hourlyRate ?? current.hourlyRate, minimumHours: input.minimumHours ?? current.minimumHours });
  const row = await prisma.appSetting.upsert({ where: { key: "GUIDE_PRICING" }, create: { key: "GUIDE_PRICING", value: next }, update: { value: next } });
  return { ...parseGuidePricing(row.value), updatedAt: row.updatedAt };
}

export async function updateTaxConfig(input: Partial<TaxConfig>): Promise<TaxConfig> {
  const current = await getTaxConfig();
  const next = parseTax({ rideGstRate: input.rideGstRate ?? current.rideGstRate, guideGstRate: input.guideGstRate ?? current.guideGstRate });
  const row = await prisma.appSetting.upsert({ where: { key: "GST_CONFIG" }, create: { key: "GST_CONFIG", value: next }, update: { value: next } });
  return { ...parseTax(row.value), updatedAt: row.updatedAt };
}

function normalizeStops(value: unknown): RouteStop[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const stop = item as Record<string, unknown>;
    return { name: String(stop.name ?? "Stop"), address: stop.address == null ? undefined : String(stop.address), latitude: Number(stop.latitude), longitude: Number(stop.longitude) };
  }).filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude) && Math.abs(s.latitude) <= 90 && Math.abs(s.longitude) <= 180);
}

export async function calculateFare(
  origin: Coordinate,
  destination: Coordinate,
  destinations: RouteStop[] = [],
  serviceType: "RIDE_ONLY" | "GUIDE_ONLY" | "RIDE_AND_GUIDE" = "RIDE_ONLY",
): Promise<FareQuote> {
  const [ridePricing, guidePricing, tax] = await Promise.all([getRidePricing(), getGuidePricing(), getTaxConfig()]);
  const adapter = new GooglePlaceRouteAdapter();
  const waypoints = normalizeStops(destinations);
  const points: Coordinate[] = [origin, ...waypoints, destination];
  const legs: RouteResult[] = [];
  for (let i = 0; i < points.length - 1; i += 1) legs.push(await adapter.getRoute(points[i], points[i + 1]));

  const distanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  const durationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);
  const distanceFare = (distanceMeters / 1000) * ridePricing.perKm;
  const calculatedRideFare = Math.max(ridePricing.minimumFare, ridePricing.baseFare + distanceFare);
  const rideFare = serviceType === "GUIDE_ONLY" ? 0 : calculatedRideFare;
  const guideHours = serviceType === "RIDE_ONLY" ? 0 : Math.max(guidePricing.minimumHours, Math.ceil(durationSeconds / 3600));
  const guideFare = serviceType === "RIDE_ONLY" ? 0 : guideHours * guidePricing.hourlyRate;
  const subtotal = rideFare + guideFare;
  const rideGstAmount = rideFare * tax.rideGstRate / 100;
  const guideGstAmount = guideFare * tax.guideGstRate / 100;
  const gstAmount = rideGstAmount + guideGstAmount;
  const totalFare = subtotal + gstAmount;

  return {
    currency: "INR",
    distanceMeters,
    durationSeconds,
    baseFare: money(serviceType === "GUIDE_ONLY" ? 0 : ridePricing.baseFare),
    distanceFare: money(serviceType === "GUIDE_ONLY" ? 0 : distanceFare),
    rideFare: money(rideFare),
    guideFare: money(guideFare),
    guideHours,
    subtotal: money(subtotal),
    rideGstRate: tax.rideGstRate,
    rideGstAmount: money(rideGstAmount),
    guideGstRate: tax.guideGstRate,
    guideGstAmount: money(guideGstAmount),
    gstAmount: money(gstAmount),
    totalFare: money(totalFare),
    stops: waypoints.map((stop, index) => ({ name: stop.name, distanceMeters: legs[index]?.distanceMeters ?? 0, durationSeconds: legs[index]?.durationSeconds ?? 0 })),
  };
}
