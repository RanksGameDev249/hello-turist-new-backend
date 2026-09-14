import { Request, Response } from "express";
import { apiError, apiSuccess } from "../../core/api-response";
import { MockPlaceRouteAdapter } from "./place-route.adapter";
import { routeSchema, searchPlacesSchema } from "./place-route.schema";

const adapter = new MockPlaceRouteAdapter();

export async function searchPlacesController(req: Request, res: Response) {
  const parsed = searchPlacesSchema.safeParse({ query: req.query.query, location: req.query.latitude && req.query.longitude ? { latitude: req.query.latitude, longitude: req.query.longitude } : undefined });
  if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  return apiSuccess(res, await adapter.searchPlaces(parsed.data.query, parsed.data.location));
}

export async function getPlaceController(req: Request, res: Response) {
  if (!req.params.id) return apiError(res, 400, "VALIDATION_ERROR", "Place id is required");
  const place = await adapter.getPlace(req.params.id);
  return place ? apiSuccess(res, place) : apiError(res, 404, "PLACE_NOT_FOUND", "Place not found");
}

export async function getRouteController(req: Request, res: Response) {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  return apiSuccess(res, await adapter.getRoute(parsed.data.origin, parsed.data.destination));
}
