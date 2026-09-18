import type { Request, Response } from "express";
import { listVerificationRequests, getVerificationRequest, updateVerificationRequest } from "./verification.service";

export async function getVerificationRequests(req: Request, res: Response) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await listVerificationRequests({ page, limit, status });
  return res.json({ success: true, data: result });
}

export async function getVerificationRequestById(req: Request, res: Response) {
  const request = await getVerificationRequest(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Verification request not found" });
  return res.json({ success: true, data: request });
}

export async function decideVerificationRequest(req: Request, res: Response) {
  const status = req.body?.status;
  if (status !== "APPROVED" && status !== "REJECTED") return res.status(400).json({ success: false, message: "status must be APPROVED or REJECTED" });
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : undefined;
  if (status === "REJECTED" && !reason) return res.status(400).json({ success: false, message: "reason is required when rejecting" });
  const request = await updateVerificationRequest(req.params.id, status, reason);
  return res.json({ success: true, data: request });
}
