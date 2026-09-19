import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { completeRideRecordingController, createRideRecordingUploadController, listRideRecordingsController } from "./ride-recording.controller";

const router = Router();
router.use(authMiddleware);
router.post("/:id/recordings/upload-url", createRideRecordingUploadController);
router.post("/:id/recordings/:recordingId/complete", completeRideRecordingController);
router.get("/:id/recordings", listRideRecordingsController);

export default router;
