import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { fareLedgerEntrySchema, interruptRideSchema, recoverRideSchema } from "./recovery.schema";
import * as service from "./recovery.service";

function rideId(req: Request) {
  if (typeof req.params.id !== "string") throw new Error("INVALID_RIDE_ID");
  return req.params.id;
}

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND: [404, "Ride not found"],
    RIDE_ACCESS_DENIED: [403, "You do not have access to this ride"],
    DRIVER_REQUIRED: [403, "Accepted driver access required"],
    ADMIN_REQUIRED: [403, "Admin access required"],
    INVALID_RIDE_STATE: [409, "Invalid ride recovery state"],
    IDEMPOTENCY_KEY_REQUIRED: [400, "Idempotency-Key header is required"],
    NO_REPLACEMENT_DRIVER_AVAILABLE: [409, "No replacement driver is currently available"],
    INVALID_RIDE_ID: [400, "Invalid ride id"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

function idempotency(req: Request) {
  const value = req.header("Idempotency-Key");
  return typeof value === "string" ? value : undefined;
}

export async function interruptRideController(req: Request, res: Response) {
  const parsed = interruptRideSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid interruption request", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await service.interruptRide(req.user!.id, rideId(req), parsed.data, idempotency(req)), 200); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function recoverRideController(req: Request, res: Response) {
  const parsed = recoverRideSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid recovery request", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await service.recoverRide(req.user!.id, rideId(req), parsed.data, idempotency(req)), 200); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function addFareLedgerController(req: Request, res: Response) {
  const parsed = fareLedgerEntrySchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid fare ledger entry", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await service.addFareLedgerEntry(req.user!.id, rideId(req), parsed.data, idempotency(req)), 201); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function listFareLedgerController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await service.listFareLedger(req.user!.id, rideId(req))); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function listRecoveryActionsController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await service.listRecoveryActions(req.user!.id, rideId(req))); } catch (e) { return handleError(res, req.requestId, e); }
}
