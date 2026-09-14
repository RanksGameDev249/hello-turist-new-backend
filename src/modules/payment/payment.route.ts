import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  createPaymentController,
  createRefundController,
  getPaymentController,
  listPaymentsController,
  paymentWebhookController,
} from "./payment.controller";

const router = Router();

router.post("/webhook", paymentWebhookController);
router.use(authMiddleware);
router.post("/", createPaymentController);
router.get("/", listPaymentsController);
router.get("/:id", getPaymentController);
router.post("/:id/refunds", createRefundController);

export default router;
