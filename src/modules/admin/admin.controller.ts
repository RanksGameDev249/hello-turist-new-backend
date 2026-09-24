import { Request, Response } from "express";
import { updateRoleVerificationSchema, verificationDecisionSchema } from "./admin.schema";
import { decideVerificationRequest, updateRoleVerification } from "./admin.service";
import { writeAuditLog } from "./audit.service";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorResponse(req: Request, res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, data: null, error: { code, message, ...(details !== undefined ? { details } : {}) }, requestId: req.requestId });
}

export async function updateUserRoleVerification(req: Request, res: Response) {
  try {
    const userId = param(req.params.userId);
    const role = param(req.params.role)?.toUpperCase();
    if (!userId || !role) return errorResponse(req, res, 400, "INVALID_REQUEST", "userId and role are required");
    if (role !== "DRIVER" && role !== "GUIDE") return errorResponse(req, res, 400, "INVALID_ROLE", "Only DRIVER or GUIDE roles can be verified");
    const parsed = updateRoleVerificationSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(req, res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());

    const result = await updateRoleVerification(userId, role, parsed.data.verificationStatus);
    await writeAuditLog({ actorUserId: req.user!.id, action: "ROLE_VERIFICATION_UPDATED", entityType: "USER_ROLE", entityId: userId, metadata: { role, verificationStatus: parsed.data.verificationStatus }, requestId: req.requestId });
    return res.status(200).json({ success: true, data: result, error: null, requestId: req.requestId });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") return errorResponse(req, res, 404, error.message, "User not found");
      if (error.message === "ROLE_NOT_FOUND") return errorResponse(req, res, 404, error.message, "Requested role not found for this user");
    }
    console.error("ADMIN_ROLE_VERIFICATION_ERROR:", error);
    return errorResponse(req, res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong");
  }
}

export async function decideVerification(req: Request, res: Response) {
  const requestId = param(req.params.id);
  if (!requestId) return errorResponse(req, res, 400, "INVALID_REQUEST", "Verification request id is required");
  const parsed = verificationDecisionSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(req, res, 400, "VALIDATION_ERROR", "Invalid verification decision", parsed.error.flatten());

  try {
    const data = await decideVerificationRequest(requestId, parsed.data.status, parsed.data.rejectionReason);
    await writeAuditLog({ actorUserId: req.user!.id, action: "VERIFICATION_DECISION", entityType: "VERIFICATION_REQUEST", entityId: requestId, metadata: { status: parsed.data.status }, requestId: req.requestId });
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "VERIFICATION_REQUEST_NOT_FOUND") return errorResponse(req, res, 404, error.message, "Verification request not found");
      if (error.message === "INVALID_ROLE") return errorResponse(req, res, 400, error.message, "Only DRIVER or GUIDE requests can be reviewed");
      if (error.message === "INVALID_VERIFICATION_STATE") return errorResponse(req, res, 409, error.message, "Verification request is not awaiting review");
      if (error.message === "DOCUMENTS_REQUIRED") return errorResponse(req, res, 400, error.message, "At least one verification document is required");
      if (error.message === "LIVE_SESSION_REQUIRED") return errorResponse(req, res, 400, error.message, "Live verification must be in progress before admin approval");
      if (error.message === "DOCUMENT_EXPIRED") return errorResponse(req, res, 400, error.message, "One or more verification documents are expired");
    }
    console.error("ADMIN_VERIFICATION_DECISION_ERROR:", error);
    return errorResponse(req, res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong");
  }
}
