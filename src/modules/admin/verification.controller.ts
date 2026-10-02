import type { Request, Response } from "express";
import { listVerificationRequests, getVerificationRequest, updateVerificationRequest, startAdminWhatsAppLiveSession } from "./verification.service";

const id=(req:Request)=>{const value=req.params.id;if(typeof value!=="string")throw new Error("INVALID_ID");return value;};

function errorResponse(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, message, error: { code, message } });
}

function handleVerificationError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
  const map: Record<string, [number, string]> = {
    VERIFICATION_REQUEST_NOT_FOUND: [404, "Verification request not found"],
    VERIFICATION_ALREADY_DECIDED: [409, "Verification request has already been decided"],
    INVALID_VERIFICATION_STATE: [409, "Verification request is not awaiting review"],
    DOCUMENTS_REQUIRED: [400, "At least one verification document is required"],
    LIVE_SESSION_REQUIRED: [400, "Live verification must be in progress before approval"],
    WHATSAPP_LIVE_SESSION_REQUIRED: [400, "Verification requires an admin-tracked WhatsApp live session"],
    DOCUMENT_EXPIRED: [400, "One or more verification documents are expired"],
  };
  const mapped = map[code];
  return mapped ? errorResponse(res, mapped[0], code, mapped[1]) : errorResponse(res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong");
}

export async function getVerificationRequests(req: Request, res: Response) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const role = req.query.role === "DRIVER" || req.query.role === "GUIDE" ? req.query.role : undefined;
    const result = await listVerificationRequests({ page, limit, status, role });
    return res.json({ success: true, data: result });
  } catch (error) { return handleVerificationError(res, error); }
}

export async function getVerificationRequestById(req: Request, res: Response) {
  try {
    const request = await getVerificationRequest(id(req));
    if (!request) return errorResponse(res, 404, "VERIFICATION_REQUEST_NOT_FOUND", "Verification request not found");
    return res.json({ success: true, data: request });
  } catch (error) { return handleVerificationError(res, error); }
}

export async function startWhatsAppLiveVerification(req: Request, res: Response) {
  try {
    const request = await startAdminWhatsAppLiveSession(id(req), typeof req.body?.phone === "string" ? req.body.phone : undefined);
    return res.json({ success: true, data: request });
  } catch (error) { return handleVerificationError(res, error); }
}

export async function decideVerificationRequest(req: Request, res: Response) {
  const status = req.body?.status;
  if (status !== "VERIFIED" && status !== "REJECTED") return errorResponse(res, 400, "VALIDATION_ERROR", "status must be VERIFIED or REJECTED");
  const reason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : undefined;
  if (status === "REJECTED" && !reason) return errorResponse(res, 400, "VALIDATION_ERROR", "rejectionReason is required when rejecting");
  try {
    const request = await updateVerificationRequest(id(req), status, reason);
    return res.json({ success: true, data: request });
  } catch (error) { return handleVerificationError(res, error); }
}
