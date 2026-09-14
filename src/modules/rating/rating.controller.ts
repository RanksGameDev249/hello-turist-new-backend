import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createRatingSchema, rideIdSchema } from "./rating.schema";
import { createRideRating, getRatingSummary, listGivenRatings, listReceivedRatings } from "./rating.service";

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND: [404, "Ride not found"],
    RIDE_NOT_COMPLETED: [409, "Rating is available only after ride completion"],
    RIDE_PROVIDER_NOT_FOUND: [409, "No accepted provider is attached to this ride"],
    RATING_NOT_ALLOWED: [403, "You are not a participant in this ride"],
    RATING_ALREADY_EXISTS: [409, "You have already rated this ride"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function createRideRatingController(req: Request, res: Response) {
  const params = rideIdSchema.safeParse(req.params);
  if (!params.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid ride id", params.error.flatten());
  const body = createRatingSchema.safeParse(req.body);
  if (!body.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid rating", body.error.flatten());

  try {
    return successResponse(
      res,
      req.requestId,
      await createRideRating(req.user!.id, params.data.id, body.data),
      201,
    );
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function listGivenRatingsController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await listGivenRatings(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function listReceivedRatingsController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await listReceivedRatings(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}

export async function getRatingSummaryController(req: Request, res: Response) {
  try {
    return successResponse(res, req.requestId, await getRatingSummary(req.user!.id));
  } catch (error) {
    return handleError(res, req.requestId, error);
  }
}
