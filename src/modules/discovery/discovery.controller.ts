import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createCuratedPlaceSchema, curatedPlaceIdSchema, publicDiscoveryQuerySchema, updateCuratedPlaceSchema } from "./discovery.schema";
import { createCuratedPlace, deleteCuratedPlace, getCuratedPlace, listPublishedDiscovery, updateCuratedPlace } from "./discovery.service";
import { listHomeDiscoveries, listMapPlaces } from "./discovery.views";
import { writeAuditLog } from "../admin/audit.service";

function fail(req: Request, res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : "DISCOVERY_OPERATION_FAILED";
  const status = code === "CURATED_PLACE_NOT_FOUND" ? 404 : 500;
  return errorResponse(res, req.requestId, status, code, code === "CURATED_PLACE_NOT_FOUND" ? "Curated place not found" : "Discovery operation failed");
}

export async function listDiscoveryController(req: Request, res: Response) {
  const parsed = publicDiscoveryQuerySchema.safeParse(req.query);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid discovery query", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await listPublishedDiscovery(parsed.data)); } catch (e) { return fail(req, res, e); }
}

export async function listMapPlacesController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await listMapPlaces(Math.min(Math.max(Number(req.query.limit) || 100, 1), 100))); } catch (e) { return fail(req, res, e); }
}

export async function listHomeDiscoveriesController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await listHomeDiscoveries(Math.min(Math.max(Number(req.query.limit) || 50, 1), 100))); } catch (e) { return fail(req, res, e); }
}

export async function getDiscoveryController(req: Request, res: Response) {
  const parsed = curatedPlaceIdSchema.safeParse(req.params);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid curated place id");
  try { return successResponse(res, req.requestId, await getCuratedPlace(parsed.data.id)); } catch (e) { return fail(req, res, e); }
}

export async function listAdminDiscoveryController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await listPublishedDiscovery({ type: typeof req.query.type === "string" ? req.query.type : undefined, city: typeof req.query.city === "string" ? req.query.city : undefined, limit: Math.min(Math.max(Number(req.query.limit) || 100, 1), 200) })); } catch (e) { return fail(req, res, e); }
}

export async function createAdminDiscoveryController(req: Request, res: Response) {
  const parsed = createCuratedPlaceSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid curated place", parsed.error.flatten());
  try {
    const item = await createCuratedPlace(parsed.data, req.user!.id);
    await writeAuditLog({ actorUserId: req.user!.id, action: "CURATED_PLACE_CREATED", entityType: "CURATED_PLACE", entityId: item.id, metadata: { type: item.type, name: item.name }, requestId: req.requestId });
    return successResponse(res, req.requestId, item, 201);
  } catch (e) { return fail(req, res, e); }
}

export async function updateAdminDiscoveryController(req: Request, res: Response) {
  const id = curatedPlaceIdSchema.safeParse(req.params);
  const parsed = updateCuratedPlaceSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid curated place update", parsed.success ? undefined : parsed.error.flatten());
  try {
    const item = await updateCuratedPlace(id.data.id, parsed.data);
    await writeAuditLog({ actorUserId: req.user!.id, action: "CURATED_PLACE_UPDATED", entityType: "CURATED_PLACE", entityId: id.data.id, metadata: { changed: Object.keys(parsed.data) }, requestId: req.requestId });
    return successResponse(res, req.requestId, item);
  } catch (e) { return fail(req, res, e); }
}

export async function deleteAdminDiscoveryController(req: Request, res: Response) {
  const id = curatedPlaceIdSchema.safeParse(req.params);
  if (!id.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid curated place id");
  try {
    const item = await deleteCuratedPlace(id.data.id);
    await writeAuditLog({ actorUserId: req.user!.id, action: "CURATED_PLACE_DEACTIVATED", entityType: "CURATED_PLACE", entityId: id.data.id, requestId: req.requestId });
    return successResponse(res, req.requestId, item);
  } catch (e) { return fail(req, res, e); }
}
