import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  createRideRatingController,
  getRatingSummaryController,
  listGivenRatingsController,
  listReceivedRatingsController,
} from "./rating.controller";

const router = Router();
router.use(authMiddleware);

router.post("/rides/:id/rating", createRideRatingController);
router.get("/ratings/given", listGivenRatingsController);
router.get("/ratings/received", listReceivedRatingsController);
router.get("/ratings/summary", getRatingSummaryController);

export default router;
