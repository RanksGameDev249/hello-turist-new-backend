import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { interruptRideSchema, recoverRideSchema } from "./recovery.schema";
import * as service from "./recovery.service";

function rideId(req: Request) {
  const { id } = req.params;
  if (typeof id !== "string") throw new Error("INVALID_RIDE_ID");
  return id;
}

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND: [404, "Ride not found"],
    RIDE_ACCESS_DENIED: [403, "You do not have access to this ride"],
    INVALID_RIDE_ID: [400, "Invalid ride id"],
    INVALID_RIDE_STATE: [409, "Invalid ride state transition"],
    DRIVER_NOT_VERIFIED: [400, "Driver is not verified"],
    DRIVER_NOT_AVAILABLE: [409, "Driver is not currently available"],
    DRIVER_ALREADY_ASSIGNED: [409, "Driver is already associated with this ride"],
    NO_REPLACEMENT_DRIVER_AVAILABLE: [409, "No replacement driver is currently available"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function interruptRideController(req: Request, res: Response) {
  const parsed = interruptRideSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid interruption request", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await service.interruptRide(req.user.id, rideId(req), parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function recoverRideController(req: Request, res: Response) {
  const parsed = recoverRideSchema.safeParse(req.body ?? {});
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid recovery request", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await service.recoverRide(req.user.id, rideId(req), parsed.data), 201);
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}
