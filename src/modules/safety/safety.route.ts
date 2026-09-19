import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  acceptTrustedContactInvitationController, acknowledgeEmergencyController, createEmergencyIncidentController, createTrustedContactController,
  deleteTrustedContactController, escalateEmergencyController, getEmergencyIncidentController, listTrustedContactsController,
  recordRideHeartbeatController, resolveEmergencyController, safetyOverviewController, shareTripController,
  createRideRecordingConsentController,
} from "./safety.controller";
import { notifyTrustedContactsForEmergency } from "./trusted-contact-notifier";

const router = Router();
router.use(authMiddleware);
router.get("/safety", safetyOverviewController);
router.get("/trusted-contacts", listTrustedContactsController);
router.post("/trusted-contacts/invitations", createTrustedContactController);
router.post("/trusted-contacts/invitations/:id/accept", acceptTrustedContactInvitationController);
router.delete("/trusted-contacts/:id", deleteTrustedContactController);
router.post("/trips/:id/share", shareTripController);
router.post("/emergency/incidents", (req, res) => {
  let incidentId: string | undefined;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === "object") {
      const candidate = body as { data?: { id?: unknown } };
      if (typeof candidate.data?.id === "string") incidentId = candidate.data.id;
    }
    return originalJson(body);
  }) as typeof res.json;
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300 && incidentId) {
      void notifyTrustedContactsForEmergency(incidentId).catch(() => undefined);
    }
  });
  return createEmergencyIncidentController(req, res);
});
router.get("/emergency/incidents/:id", getEmergencyIncidentController);
router.post("/emergency/incidents/:id/acknowledge", acknowledgeEmergencyController);
router.post("/emergency/incidents/:id/escalate", escalateEmergencyController);
router.post("/emergency/incidents/:id/resolve", resolveEmergencyController);
router.post("/rides/:id/heartbeat", recordRideHeartbeatController);
router.post("/rides/:id/recording-consent", createRideRecordingConsentController);
export default router;
