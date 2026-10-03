import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { nearbyPartnerPromotionSchema } from "./partner-promotion.schema";
import { notifyNearbyPartners } from "./partner-promotion.service";

export async function nearbyPartnerPromotionController(req: Request, res: Response) {
  const parsed = nearbyPartnerPromotionSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid nearby partner notification request", parsed.error.flatten());
  try {
    return successResponse(res, req.requestId, await notifyNearbyPartners(req.user!.id, parsed.data));
  } catch (error) {
    const code = error instanceof Error ? error.message : "PARTNER_PROMOTION_FAILED";
    return errorResponse(res, req.requestId, 500, code, "Unable to prepare nearby partner notifications");
  }
}
