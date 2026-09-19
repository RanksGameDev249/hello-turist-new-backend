import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { interruptRideController, recoverRideController } from "./recovery.controller";

const router = Router();
router.use(authMiddleware);
router.post("/:id/interrupt", interruptRideController);
router.post("/:id/recover", recoverRideController);

export default router;
