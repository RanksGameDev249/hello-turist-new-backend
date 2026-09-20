import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { triggerRideEmergency } from "./ride-emergency.service";

export async function triggerRideEmergencyController(req: Request, res: Response) {
  const rideId = typeof req.params.id === "string" ? req.params.id : "";
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined;
  if (!rideId) return errorResponse(res, req.requestId, 400, "INVALID_RIDE_ID", "Invalid ride id");
  try {
    return successResponse(res, req.requestId, await triggerRideEmergency(req.user!.id, rideId, reason), 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const map: Record<string, [number, string]> = {
      RIDE_NOT_FOUND: [404, "Ride not found"],
      RIDE_ACCESS_DENIED: [403, "You do not have access to this ride"],
      INVALID_RIDE_STATE: [409, "Ride is not active"],
      SOS_COOLDOWN: [409, "An emergency alert was already triggered recently"]
    };
    const [status, message] = map[code] ?? [500, "Internal server error"];
    return errorResponse(res, req.requestId, status, code, message);
  }
}
