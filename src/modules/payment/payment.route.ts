import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { createPaymentController, createRefundController, createRazorpayOrderController, getPaymentController, listPaymentsController, paymentWebhookController, verifyRazorpayPaymentController } from "./payment.controller";

const router = Router();
router.post("/webhook", paymentWebhookController);
// Public compatibility endpoint matching the product API specification.
router.use(authMiddleware);
router.post("/razorpay/order", createRazorpayOrderController);
// Documentation-compatible aliases; existing Android clients keep using /razorpay/*.
router.post("/orders", createRazorpayOrderController);
router.post("/razorpay/verify", verifyRazorpayPaymentController);
router.post("/:id/verify", verifyRazorpayPaymentController);
router.post("/", createPaymentController);
router.get("/", listPaymentsController);
router.get("/:id", getPaymentController);
router.post("/:id/refunds", createRefundController);
router.post("/:id/refund", createRefundController);
export default router;
