import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { idempotencyMiddleware } from "../../middleware/idempotency";
import { acceptRideController, addEventController, addLocationController, assignRideController, cancelRideController, createRideController, getRideController, listEventsController, listLocationsController, listRidesController, rejectRideController } from "./ride.controller";
import { driverArrivingController, driverArrivedController, startRideController, nearDestinationController, completeRideController } from "./ride-action.controller";
import { fareQuoteController } from "./fare.controller";
import { listDriverRidesController } from "./driver-ride.controller";
import { listAssignmentsController, guideSearchController, acceptAssignmentController, rejectAssignmentController } from "./dispatch.controller";
import { listGuideAssignmentsController, offerGuideController, acceptGuideAssignmentController, rejectGuideAssignmentController } from "./guide-assignment.controller";
import { notifyAcceptedTrustedContactsForRide } from "../safety/trusted-contact-notifier";

const router = Router();
router.use(authMiddleware);
router.get("/driver", listDriverRidesController);
router.post("/fare-quote", fareQuoteController);
// Documentation-compatible alias. Keep /fare-quote for existing clients.
router.post("/quote", fareQuoteController);
router.post("/", idempotencyMiddleware(), createRideController);
router.get("/", listRidesController);
// Documentation-compatible history alias; preserves the cursor-based list contract.
router.get("/history", listRidesController);
router.get("/:id/assignments", listAssignmentsController);
router.post("/:id/guide-search", guideSearchController);
router.get("/:id/guide-assignments", listGuideAssignmentsController);
router.post("/:id/guide-assignments", offerGuideController);
router.post("/:id/guide-assignments/:assignmentId/accept", acceptGuideAssignmentController);
router.post("/:id/guide-assignments/:assignmentId/reject", rejectGuideAssignmentController);
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
router.post("/:id/arrived", driverArrivedController);
router.post("/:id/start", (req, res) => {
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      void notifyAcceptedTrustedContactsForRide(req.params.id as string, "RIDE_STARTED", { triggeredBy: req.user?.id }).catch(() => undefined);
    }
  });
  return startRideController(req, res);
});
router.post("/:id/near-destination", nearDestinationController);
router.post("/:id/complete", completeRideController);
router.post("/:id/events", (req, res) => {
  const rideId = req.params.id;
  const isRideStarted = req.body?.type === "RIDE_STARTED";
  if (!isRideStarted || typeof rideId !== "string") return addEventController(req, res);
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      void notifyAcceptedTrustedContactsForRide(rideId, "RIDE_STARTED", { triggeredBy: req.user?.id }).catch(() => undefined);
    }
  });
  return addEventController(req, res);
});
router.get("/:id/events", listEventsController);

export default router;
