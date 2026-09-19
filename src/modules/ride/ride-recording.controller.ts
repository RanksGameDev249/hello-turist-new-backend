import type { Request, Response } from "express";
import { z } from "zod";
import { completeRideRecording, createRideRecordingUpload, listRideRecordings } from "./ride-recording.service";

const uploadSchema = z.object({
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

const completeSchema = z.object({ checksum: z.string().trim().min(8).max(256).optional() });

function rideId(req: Request) {
  const value = req.params.id;
  if (typeof value !== "string") throw new Error("INVALID_RIDE_ID");
  return value;
}

function respondError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    INVALID_RIDE_ID: [400, "Invalid ride id"],
    RIDE_NOT_FOUND: [404, "Ride not found"],
    RIDE_RECORDING_ACCESS_DENIED: [403, "You do not have access to this ride recording"],
    RECORDING_RIDE_NOT_ACTIVE: [409, "Recording is only allowed while the ride is active"],
    RECORDING_CONSENT_REQUIRED: [409, "Recording consent is required before upload"],
    UNSUPPORTED_RECORDING_TYPE: [400, "Unsupported recording media type"],
    INVALID_RECORDING_SIZE: [400, "Invalid recording size"],
    RECORDING_NOT_FOUND: [404, "Recording not found"],
    RECORDING_NOT_UPLOADABLE: [409, "Recording is no longer uploadable"],
    RECORDING_OBJECT_MISMATCH: [400, "Uploaded object does not match the declared recording"],
    PRIVATE_OBJECT_NOT_FOUND: [400, "Uploaded recording object was not found"],
    R2_STORAGE_NOT_CONFIGURED: [503, "Private media storage is not configured"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return res.status(status).json({ success: false, data: null, error: { code, message }, requestId });
}

export async function createRideRecordingUploadController(req: Request, res: Response) {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: "Invalid recording upload data" }, requestId: req.requestId });
  try {
    const data = await createRideRecordingUpload({ userId: req.user!.id, rideId: rideId(req), ...parsed.data });
    return res.status(201).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    return respondError(res, req.requestId, error);
  }
}

export async function completeRideRecordingController(req: Request, res: Response) {
  const parsed = completeSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: "Invalid recording completion data" }, requestId: req.requestId });
  const recordingId = req.params.recordingId;
  if (typeof recordingId !== "string") return res.status(400).json({ success: false, data: null, error: { code: "INVALID_RECORDING_ID", message: "Invalid recording id" }, requestId: req.requestId });
  try {
    const data = await completeRideRecording({ userId: req.user!.id, rideId: rideId(req), recordingId, checksum: parsed.data.checksum });
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    return respondError(res, req.requestId, error);
  }
}

export async function listRideRecordingsController(req: Request, res: Response) {
  try {
    const data = await listRideRecordings(req.user!.id, rideId(req));
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    return respondError(res, req.requestId, error);
  }
}
