import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  acceptTrustedContactInvitationController, acknowledgeEmergencyController, createEmergencyIncidentController, createTrustedContactController,
  deleteTrustedContactController, escalateEmergencyController, getEmergencyIncidentController, listTrustedContactsController,
  recordRideHeartbeatController, resolveEmergencyController, safetyOverviewController, shareTripController,
  createRideRecordingConsentController,
} from "./safety.controller";

const router = Router();
router.use(authMiddleware);
router.get("/safety", safetyOverviewController);
router.get("/trusted-contacts", listTrustedContactsController);
router.post("/trusted-contacts/invitations", createTrustedContactController);
router.post("/trusted-contacts/invitations/:id/accept", acceptTrustedContactInvitationController);
router.delete("/trusted-contacts/:id", deleteTrustedContactController);
router.post("/trips/:id/share", shareTripController);
router.post("/emergency/incidents", createEmergencyIncidentController);
router.get("/emergency/incidents/:id", getEmergencyIncidentController);
router.post("/emergency/incidents/:id/acknowledge", acknowledgeEmergencyController);
router.post("/emergency/incidents/:id/escalate", escalateEmergencyController);
router.post("/emergency/incidents/:id/resolve", resolveEmergencyController);
router.post("/rides/:id/heartbeat", recordRideHeartbeatController);
router.post("/rides/:id/recording-consent", createRideRecordingConsentController);
export default router;
