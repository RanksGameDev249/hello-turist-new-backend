import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { acceptRideController, addEventController, addLocationController, assignRideController, cancelRideController, createRideController, getRideController, listEventsController, listLocationsController, listRidesController, rejectRideController } from "./ride.controller";
import { fareQuoteController } from "./fare.controller";
import { listDriverRidesController } from "./driver-ride.controller";
import { notifyAcceptedTrustedContactsForRide } from "../safety/trusted-contact-notifier";

const router = Router();
router.use(authMiddleware);
router.get("/driver", listDriverRidesController);
router.post("/fare-quote", fareQuoteController);
router.post("/", createRideController);
router.get("/", listRidesController);
router.get("/:id", getRideController);
router.post("/:id/cancel", cancelRideController);
router.post("/:id/assign", assignRideController);
router.post("/:id/accept", acceptRideController);
router.post("/:id/reject", rejectRideController);
router.post("/:id/location", addLocationController);
router.get("/:id/locations", listLocationsController);
router.post("/:id/events", (req, res, next) => {
  const rideId = req.params.id;
  const isRideStarted = req.body?.type === "RIDE_STARTED";
  if (!isRideStarted || typeof rideId !== "string") return addEventController(req, res, next);
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      void notifyAcceptedTrustedContactsForRide(rideId, "RIDE_STARTED", { triggeredBy: req.user?.id }).catch(() => undefined);
    }
  });
  return addEventController(req, res, next);
});
router.get("/:id/events", listEventsController);

export default router;
