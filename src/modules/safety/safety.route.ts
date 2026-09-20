import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  acceptTrustedContactInvitationController, acknowledgeEmergencyController, createEmergencyIncidentController, createTrustedContactController,
  deleteTrustedContactController, escalateEmergencyController, getEmergencyIncidentController, listTrustedContactsController,
  recordRideHeartbeatController, resolveEmergencyController, safetyOverviewController, shareTripController,
  createRideRecordingConsentController,
} from "./safety.controller";
import { notifyTrustedContactsForEmergency } from "./trusted-contact-notifier";
import { createRecordingAccessUrl, finalizeRideRecording, prepareRideRecordingUpload } from "../ride-safety/recording.service";

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
    if (res.statusCode >= 200 && res.statusCode < 300 && incidentId) void notifyTrustedContactsForEmergency(incidentId).catch(() => undefined);
  });
  return createEmergencyIncidentController(req, res);
});
router.get("/emergency/incidents/:id", getEmergencyIncidentController);
router.post("/emergency/incidents/:id/acknowledge", acknowledgeEmergencyController);
router.post("/emergency/incidents/:id/escalate", escalateEmergencyController);
router.post("/emergency/incidents/:id/resolve", resolveEmergencyController);
router.post("/rides/:id/heartbeat", recordRideHeartbeatController);
router.post("/rides/:id/recording-consent", createRideRecordingConsentController);

router.post("/rides/:id/recordings/upload-url", async (req, res) => {
  try {
    const data = await prepareRideRecordingUpload(req.user!.id, req.params.id, String(req.body?.contentType ?? ""));
    return res.status(200).json({ success: true, data, error: null });
  } catch (error) {
    return res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "RECORDING_UPLOAD_FAILED" });
  }
});
router.post("/rides/:id/recordings/complete", async (req, res) => {
  try {
    const data = await finalizeRideRecording(req.user!.id, req.params.id, String(req.body?.key ?? ""), String(req.body?.contentType ?? ""), req.body?.bytes === undefined ? undefined : Number(req.body.bytes));
    return res.status(201).json({ success: true, data, error: null });
  } catch (error) {
    return res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "RECORDING_FINALIZE_FAILED" });
  }
});
router.get("/rides/:id/recordings/:recordingId/access", async (req, res) => {
  try {
    const url = await createRecordingAccessUrl(req.user!.id, req.params.id, req.params.recordingId);
    return res.status(200).json({ success: true, data: { url }, error: null });
  } catch (error) {
    return res.status(403).json({ success: false, data: null, error: error instanceof Error ? error.message : "RECORDING_ACCESS_DENIED" });
  }
});

export default router;
