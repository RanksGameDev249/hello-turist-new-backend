import { Request, Response } from "express";
import { prisma } from "../../core/prisma";

export async function listRideEmergencyIncidents(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const incidents = await prisma.rideEmergencyIncident.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "desc" }, take: 100 });
  return res.json({ success: true, data: incidents, error: null, requestId: req.requestId });
}

export async function acknowledgeRideEmergencyIncident(req: Request, res: Response) {
  const id = String(req.params.id);
  const incident = await prisma.rideEmergencyIncident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ success: false, data: null, error: { code: "INCIDENT_NOT_FOUND", message: "Emergency incident not found" }, requestId: req.requestId });
  if (incident.status !== "OPEN") return res.status(409).json({ success: false, data: null, error: { code: "INVALID_INCIDENT_STATE", message: "Incident is not open" }, requestId: req.requestId });
  const updated = await prisma.rideEmergencyIncident.update({ where: { id }, data: { status: "ACKNOWLEDGED", acknowledgedBy: req.user.id, acknowledgedAt: new Date() } });
  await prisma.rideEvent.create({ data: { rideId: incident.rideId, actorUserId: req.user.id, type: "SOS_ACKNOWLEDGED", payload: { incidentId: id } } });
  return res.json({ success: true, data: updated, error: null, requestId: req.requestId });
}

export async function resolveRideEmergencyIncident(req: Request, res: Response) {
  const id = String(req.params.id);
  const incident = await prisma.rideEmergencyIncident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ success: false, data: null, error: { code: "INCIDENT_NOT_FOUND", message: "Emergency incident not found" }, requestId: req.requestId });
  if (!["OPEN", "ACKNOWLEDGED"].includes(incident.status)) return res.status(409).json({ success: false, data: null, error: { code: "INVALID_INCIDENT_STATE", message: "Incident is already resolved" }, requestId: req.requestId });
  const updated = await prisma.rideEmergencyIncident.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  await prisma.rideEvent.create({ data: { rideId: incident.rideId, actorUserId: req.user.id, type: "SOS_RESOLVED", payload: { incidentId: id } } });
  return res.json({ success: true, data: updated, error: null, requestId: req.requestId });
}
