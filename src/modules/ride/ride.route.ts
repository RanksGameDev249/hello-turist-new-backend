import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { acceptRideController, addEventController, addLocationController, assignRideController, cancelRideController, createRideController, getRideController, listEventsController, listLocationsController, listRidesController, rejectRideController } from "./ride.controller";
import { listDriverRidesController } from "./driver-ride.controller";

const router = Router();
router.use(authMiddleware);
router.get("/driver", listDriverRidesController);
router.post("/", createRideController);
router.get("/", listRidesController);
router.get("/:id", getRideController);
router.post("/:id/cancel", cancelRideController);
router.post("/:id/assign", assignRideController);
router.post("/:id/accept", acceptRideController);
router.post("/:id/reject", rejectRideController);
router.post("/:id/location", addLocationController);
router.get("/:id/locations", listLocationsController);
router.post("/:id/events", addEventController);
router.get("/:id/events", listEventsController);

export default router;
