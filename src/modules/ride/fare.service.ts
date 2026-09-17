import { GooglePlaceRouteAdapter } from "../place-route/place-route.adapter";

export type FareQuote = {
  currency: "INR";
  distanceMeters: number;
  durationSeconds: number;
  baseFare: number;
  distanceFare: number;
  totalFare: number;
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pricingConfig() {
  const baseFare = Number(process.env.RIDE_BASE_FARE_INR);
  const perKm = Number(process.env.RIDE_PER_KM_FARE_INR);
  const minimumFare = Number(process.env.RIDE_MINIMUM_FARE_INR);
  if (![baseFare, perKm, minimumFare].every(Number.isFinite) || baseFare < 0 || perKm < 0 || minimumFare < 0) {
    throw new Error("RIDE_PRICING_CONFIG_MISSING");
  }
  return { baseFare, perKm, minimumFare };
}

export async function calculateFare(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }): Promise<FareQuote> {
  const { baseFare, perKm, minimumFare } = pricingConfig();
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
