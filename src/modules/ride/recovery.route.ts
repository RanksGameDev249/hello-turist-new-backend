import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { addFareLedgerController, interruptRideController, listFareLedgerController, listRecoveryActionsController, recoverRideController } from "./recovery.controller";

const router = Router();
router.use(authMiddleware);
router.post("/:id/interrupt", interruptRideController);
router.post("/:id/recover", recoverRideController);
router.post("/:id/fare-ledger", addFareLedgerController);
router.get("/:id/fare-ledger", listFareLedgerController);
router.get("/:id/recovery-actions", listRecoveryActionsController);

export default router;
