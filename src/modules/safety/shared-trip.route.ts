import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { contactSharedTrip, ownerSharedTrip, publicSharedTrip } from "./shared-trip.controller";

export const authenticatedSharedTripRouter = Router();
authenticatedSharedTripRouter.use(authMiddleware);
authenticatedSharedTripRouter.get("/trips/:rideId/share/:shareId", ownerSharedTrip);
authenticatedSharedTripRouter.get("/shared-trips/:shareId", contactSharedTrip);

export const publicSharedTripRouter = Router();
publicSharedTripRouter.get("/public/trips/shared/:shareId", publicSharedTrip);
