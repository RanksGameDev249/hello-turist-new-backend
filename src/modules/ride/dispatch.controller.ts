import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { assignmentIdSchema, guideSearchSchema } from "./dispatch.schema";
import * as service from "./dispatch.service";

function rideId(req: Request) {
  if (typeof req.params.id !== "string") throw new Error("INVALID_RIDE_ID");
  return req.params.id;
}

function assignmentId(req: Request) {
  const parsed = assignmentIdSchema.safeParse(req.params.assignmentId);
  if (!parsed.success) throw new Error("INVALID_ASSIGNMENT_ID");
  return parsed.data;
}

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND: [404, "Ride not found"],
    RIDE_ACCESS_DENIED: [403, "You do not have access to this ride"],
    INVALID_RIDE_ID: [400, "Invalid ride id"],
    INVALID_ASSIGNMENT_ID: [400, "Invalid assignment id"],
    DRIVER_ASSIGNMENT_NOT_FOUND: [404, "Driver assignment not found"],
    ASSIGNMENT_ACCESS_DENIED: [403, "You do not have access to this assignment"],
    DRIVER_NOT_VERIFIED: [403, "Verified driver access required"],
    DRIVER_NOT_AVAILABLE: [409, "Driver is not available"],
    INVALID_RIDE_STATE: [409, "Invalid ride state"],
    INVALID_ASSIGNMENT_STATE: [409, "Invalid assignment state"],
    RIDE_ALREADY_ACCEPTED: [409, "Another driver has already accepted this ride"],
    GUIDE_NOT_VERIFIED: [403, "Verified guide access required"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function listAssignmentsController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await service.listAssignments(req.user!.id, rideId(req)));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function guideSearchController(req: Request, res: Response) {
  const parsed = guideSearchSchema.safeParse(req.body ?? {});
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid guide search request", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await service.searchGuides(req.user!.id, rideId(req), parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function acceptAssignmentController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await service.acceptAssignment(req.user!.id, rideId(req), assignmentId(req)));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function rejectAssignmentController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await service.rejectAssignment(req.user!.id, rideId(req), assignmentId(req)));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}
