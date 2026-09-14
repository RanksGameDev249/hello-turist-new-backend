import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import {
  acceptTrustedContactInvitation, acknowledgeEmergency, createEmergencyIncident, createTrustedContact, deleteTrustedContact,
  escalateEmergency, getEmergencyIncident, getSafetyOverview, listTrustedContacts, recordRideHeartbeat, resolveEmergency, shareTrip,
} from "./safety.service";
import { createEmergencyIncidentSchema, createSharedTripSchema, createTrustedContactSchema, rideHeartbeatSchema } from "./safety.schema";

function id(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string") throw new Error("INVALID_ID");
  return value;
}

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    INVALID_ID: [400, "Invalid resource id"], FORBIDDEN: [403, "You do not have access to this resource"],
    RIDE_NOT_FOUND: [404, "Ride not found"], TRUSTED_CONTACT_NOT_FOUND: [404, "Trusted contact not found"],
    TRUSTED_CONTACT_NOT_ACCEPTED: [409, "Trusted contact invitation has not been accepted"], INVITATION_NOT_PENDING: [409, "Invitation is no longer pending"],
    EMERGENCY_NOT_FOUND: [404, "Emergency incident not found"], INVALID_EMERGENCY_TRANSITION: [409, "Invalid emergency state transition"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function safetyOverviewController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await getSafetyOverview(req.user!.id)); } catch (e) { return handleError(res, req.requestId, e); } }
export async function listTrustedContactsController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await listTrustedContacts(req.user!.id)); } catch (e) { return handleError(res, req.requestId, e); } }
export async function createTrustedContactController(req: Request, res: Response) {
  const parsed = createTrustedContactSchema.safeParse(req.body); if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid trusted contact data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await createTrustedContact(req.user!.id, parsed.data), 201); } catch (e) { return handleError(res, req.requestId, e); }
}
export async function acceptTrustedContactInvitationController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await acceptTrustedContactInvitation(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function deleteTrustedContactController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await deleteTrustedContact(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function shareTripController(req: Request, res: Response) {
  const parsed = createSharedTripSchema.safeParse(req.body); if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid trip sharing data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await shareTrip(req.user!.id, id(req, "id"), parsed.data), 201); } catch (e) { return handleError(res, req.requestId, e); }
}
export async function createEmergencyIncidentController(req: Request, res: Response) {
  const parsed = createEmergencyIncidentSchema.safeParse(req.body); if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid emergency incident data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await createEmergencyIncident(req.user!.id, parsed.data), 201); } catch (e) { return handleError(res, req.requestId, e); }
}
export async function getEmergencyIncidentController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await getEmergencyIncident(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function acknowledgeEmergencyController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await acknowledgeEmergency(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function escalateEmergencyController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await escalateEmergency(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function resolveEmergencyController(req: Request, res: Response) { try { return successResponse(res, req.requestId, await resolveEmergency(req.user!.id, id(req, "id"))); } catch (e) { return handleError(res, req.requestId, e); } }
export async function recordRideHeartbeatController(req: Request, res: Response) {
  const parsed = rideHeartbeatSchema.safeParse(req.body); if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid heartbeat data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await recordRideHeartbeat(req.user!.id, id(req, "id"), parsed.data)); } catch (e) { return handleError(res, req.requestId, e); }
}
