import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createSavedPlaceSchema, savedPlaceIdSchema, updateSavedPlaceSchema } from "./saved-place.schema";
import { createSavedPlace, deleteSavedPlace, getSavedPlace, listSavedPlaces, updateSavedPlace } from "./saved-place.service";

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    SAVED_PLACE_NOT_FOUND: [404, "Saved place not found"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

function parseId(req: Request) {
  return savedPlaceIdSchema.safeParse(req.params);
}

export async function createSavedPlaceController(req: Request, res: Response) {
  const parsed = createSavedPlaceSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid saved place", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await createSavedPlace(req.user!.id, parsed.data), 201);
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function listSavedPlacesController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await listSavedPlaces(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function getSavedPlaceController(req: Request, res: Response) {
  const parsed = parseId(req);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid saved place id", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await getSavedPlace(req.user!.id, parsed.data.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function updateSavedPlaceController(req: Request, res: Response) {
  const id = parseId(req);
  if (!id.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid saved place id", id.error.flatten());
  const parsed = updateSavedPlaceSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid saved place", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await updateSavedPlace(req.user!.id, id.data.id, parsed.data));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function deleteSavedPlaceController(req: Request, res: Response) {
  const parsed = parseId(req);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid saved place id", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await deleteSavedPlace(req.user!.id, parsed.data.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}
