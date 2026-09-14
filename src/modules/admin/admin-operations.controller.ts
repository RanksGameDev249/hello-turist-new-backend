import { Request, Response } from "express";
import { listAdminUsers, listAuditLogs } from "./audit.service";

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function listAdminUsersController(req: Request, res: Response) {
  const page = positiveInt(req.query.page, 1, 100000);
  const limit = positiveInt(req.query.limit, 20, 100);
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;

  const data = await listAdminUsers({ page, limit, status });
  return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
}

export async function listAuditLogsController(req: Request, res: Response) {
  const page = positiveInt(req.query.page, 1, 100000);
  const limit = positiveInt(req.query.limit, 50, 100);
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const actorUserId = typeof req.query.actorUserId === "string" ? req.query.actorUserId : undefined;

  const data = await listAuditLogs({ page, limit, action, entityType, actorUserId });
  return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
}
