import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { GooglePlaceRouteAdapter } from "./place-route.adapter";
import { routeSchema, searchPlacesSchema } from "./place-route.schema";

const adapter = new GooglePlaceRouteAdapter();

function handleMapsError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "GOOGLE_MAPS_ERROR";
  if (code === "GOOGLE_MAPS_API_KEY_MISSING") {
    return errorResponse(res, requestId, 503, code, "Google Maps is not configured on the server.");
  }
  return errorResponse(res, requestId, 502, "GOOGLE_MAPS_ERROR", code.startsWith("GOOGLE_MAPS_ERROR:") ? code.slice(19) : code);
}

export async function searchPlacesController(req: Request, res: Response) {
  const parsed = searchPlacesSchema.safeParse({
    query: req.query.query,
    location:
      req.query.latitude !== undefined && req.query.longitude !== undefined
        ? { latitude: req.query.latitude, longitude: req.query.longitude }
        : undefined,
  });

  if (!parsed.success) {
    return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    return successResponse(res, req.requestId, await adapter.searchPlaces(parsed.data.query, parsed.data.location));
  } catch (error) {
    return handleMapsError(res, req.requestId, error);
  }
}

export async function getPlaceController(req: Request, res: Response) {
  const id = req.params.id ?? req.query.placeId;
  if (typeof id !== "string" || !id.trim()) {
    return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Place id is required");
  }

  try {
    const place = await adapter.getPlace(id.trim());
    return place
      ? successResponse(res, req.requestId, place)
      : errorResponse(res, req.requestId, 404, "PLACE_NOT_FOUND", "Place not found");
  } catch (error) {
    return handleMapsError(res, req.requestId, error);
  }
}

export async function getRouteController(req: Request, res: Response) {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");

  try {
    return successResponse(res, req.requestId, await adapter.getRoute(parsed.data.origin, parsed.data.destination));
  } catch (error) {
    return handleMapsError(res, req.requestId, error);
  }
}
