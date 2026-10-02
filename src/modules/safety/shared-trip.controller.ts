import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { getPublicSharedTrip, getSharedTripForContact, getSharedTripForOwner } from "./shared-trip.service";

function fail(res: Response, req: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    SHARED_TRIP_NOT_FOUND: [404, "Shared trip not found"],
    SHARED_TRIP_EXPIRED: [410, "This shared trip has expired"],
    TRUSTED_CONTACT_NOT_FOUND: [404, "Trusted contact not found"],
    RIDE_NOT_FOUND: [404, "Ride not found"],
    FORBIDDEN: [403, "You do not have access to this shared trip"],
  };
  const [status, message] = map[code] ?? [500, "Unable to load shared trip"];
  return errorResponse(res, req.requestId, status, code, message);
}

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

export async function ownerSharedTrip(req: Request, res: Response) {
  try { noStore(res); return successResponse(res, req.requestId, await getSharedTripForOwner(req.user!.id, String(req.params.rideId), String(req.params.shareId))); }
  catch (e) { return fail(res, req, e); }
}

export async function contactSharedTrip(req: Request, res: Response) {
  try { noStore(res); return successResponse(res, req.requestId, await getSharedTripForContact(req.user!.id, String(req.params.shareId))); }
  catch (e) { return fail(res, req, e); }
}

export async function publicSharedTrip(req: Request, res: Response) {
  try { noStore(res); return successResponse(res, req.requestId, await getPublicSharedTrip(String(req.params.shareId))); }
  catch (e) { return fail(res, req, e); }
}
