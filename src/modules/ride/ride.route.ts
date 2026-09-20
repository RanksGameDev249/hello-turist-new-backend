import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { acceptRideController, addEventController, addLocationController, assignRideController, cancelRideController, createRideController, getRideController, listEventsController, listLocationsController, listRidesController, rejectRideController } from "./ride.controller";
import { driverArrivingController, startRideController, completeRideController } from "./ride-action.controller";
import { fareQuoteController } from "./fare.controller";
import { listDriverRidesController } from "./driver-ride.controller";
import { listAssignmentsController, guideSearchController, acceptAssignmentController, rejectAssignmentController } from "./dispatch.controller";
import { triggerRideEmergencyController } from "./ride-emergency.controller";
import { notifyAcceptedTrustedContactsForRide } from "../safety/trusted-contact-notifier";

const router = Router();
router.use(authMiddleware);
router.get("/driver", listDriverRidesController);
router.post("/fare-quote", fareQuoteController);
router.post("/", createRideController);
router.get("/", listRidesController);
router.get("/:id/assignments", listAssignmentsController);
router.post("/:id/guide-search", guideSearchController);
router.post("/:id/assignments/:assignmentId/accept", acceptAssignmentController);
router.post("/:id/assignments/:assignmentId/reject", rejectAssignmentController);
router.get("/:id", getRideController);
router.post("/:id/cancel", cancelRideController);
router.post("/:id/assign", assignRideController);
router.post("/:id/accept", acceptRideController);
router.post("/:id/reject", rejectRideController);
router.post("/:id/location", addLocationController);
router.get("/:id/locations", listLocationsController);
router.post("/:id/arriving", driverArrivingController);
router.post("/:id/sos", triggerRideEmergencyController);
router.post("/:id/start", (req, res) => {
  res.once("finish", () => { if (res.statusCode >= 200 && res.statusCode < 300) void notifyAcceptedTrustedContactsForRide(req.params.id as string, "RIDE_STARTED", { triggeredBy: req.user?.id }).catch(() => undefined); });
  return startRideController(req, res);
});
router.post("/:id/complete", completeRideController);
router.post("/:id/events", (req, res) => {
  const rideId = req.params.id;
  if (req.body?.type !== "RIDE_STARTED" || typeof rideId !== "string") return addEventController(req, res);
  res.once("finish", () => { if (res.statusCode >= 200 && res.statusCode < 300) void notifyAcceptedTrustedContactsForRide(rideId, "RIDE_STARTED", { triggeredBy: req.user?.id }).catch(() => undefined); });
  return addEventController(req, res);
});
router.get("/:id/events", listEventsController);

export default router;
