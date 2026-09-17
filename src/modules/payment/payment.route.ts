import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { createPaymentController, createRefundController, createRazorpayOrderController, getPaymentController, listPaymentsController, paymentWebhookController, verifyRazorpayPaymentController } from "./payment.controller";

const router = Router();
router.post("/webhook", paymentWebhookController);
router.use(authMiddleware);
router.post("/razorpay/order", createRazorpayOrderController);
router.post("/razorpay/verify", verifyRazorpayPaymentController);
router.post("/", createPaymentController);
router.get("/", listPaymentsController);
router.get("/:id", getPaymentController);
router.post("/:id/refunds", createRefundController);
export default router;
