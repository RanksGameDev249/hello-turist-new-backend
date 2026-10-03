import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { calculateFare, type RouteStop } from "./fare.service";

function coordinate(value: unknown, name: string, latitude = false): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (latitude ? Math.abs(parsed) > 90 : Math.abs(parsed) > 180)) throw new Error(`INVALID_${name}`);
  return parsed;
}

export async function fareQuoteController(req: Request, res: Response) {
  try {
    const origin = { latitude: coordinate(req.body?.pickupLatitude, "PICKUP_LATITUDE", true), longitude: coordinate(req.body?.pickupLongitude, "PICKUP_LONGITUDE") };
    const destination = { latitude: coordinate(req.body?.dropoffLatitude, "DROPOFF_LATITUDE", true), longitude: coordinate(req.body?.dropoffLongitude, "DROPOFF_LONGITUDE") };
    const serviceType = req.body?.serviceType === "GUIDE_ONLY" || req.body?.serviceType === "RIDE_AND_GUIDE" ? req.body.serviceType : "RIDE_ONLY";
    const destinations = Array.isArray(req.body?.destinations) ? req.body.destinations as RouteStop[] : [];
    if (destinations.length > 8) return errorResponse(res, req.requestId, 400, "TOO_MANY_DESTINATIONS", "Maximum 8 intermediate destinations are supported");
    for (const stop of destinations) {
      coordinate(stop?.latitude, "DESTINATION_LATITUDE", true);
      coordinate(stop?.longitude, "DESTINATION_LONGITUDE");
      if (!String(stop?.name ?? "").trim()) return errorResponse(res, req.requestId, 400, "INVALID_DESTINATION", "Each destination requires a name");
    }
    return successResponse(res, req.requestId, await calculateFare(origin, destination, destinations, serviceType));
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = code.startsWith("GOOGLE_") ? 503 : 400;
    return errorResponse(res, req.requestId, status, code, "Unable to calculate fare");
  }
}
