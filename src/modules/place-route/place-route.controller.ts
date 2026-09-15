import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { MockPlaceRouteAdapter } from "./place-route.adapter";
import { routeSchema, searchPlacesSchema } from "./place-route.schema";

const adapter = new MockPlaceRouteAdapter();

export async function searchPlacesController(req: Request, res: Response) {
  const parsed = searchPlacesSchema.safeParse({
    query: req.query.query,
    location:
      req.query.latitude !== undefined && req.query.longitude !== undefined
        ? { latitude: req.query.latitude, longitude: req.query.longitude }
        : undefined,
  });

  if (!parsed.success) {
    return errorResponse(
      res,
      req.requestId,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request",
    );
  }

  return successResponse(
    res,
    req.requestId,
    await adapter.searchPlaces(parsed.data.query, parsed.data.location),
  );
}

export async function getPlaceController(req: Request, res: Response) {
  const id = req.params.id;
  if (typeof id !== "string" || !id) {
    return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Place id is required");
  }

  const place = await adapter.getPlace(id);
  return place
    ? successResponse(res, req.requestId, place)
    : errorResponse(res, req.requestId, 404, "PLACE_NOT_FOUND", "Place not found");
}

export async function getRouteController(req: Request, res: Response) {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(
      res,
      req.requestId,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request",
    );
  }

  return successResponse(
    res,
    req.requestId,
    await adapter.getRoute(parsed.data.origin, parsed.data.destination),
  );
}
