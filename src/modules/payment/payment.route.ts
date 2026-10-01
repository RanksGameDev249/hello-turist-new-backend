import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { idempotencyMiddleware } from "../../middleware/idempotency";
import { createPaymentController, createRefundController, createRazorpayOrderController, getPaymentController, listPaymentsController, paymentWebhookController, verifyRazorpayPaymentController } from "./payment.controller";

const router = Router();
router.post("/webhook", paymentWebhookController);
// Public compatibility endpoint matching the product API specification.
router.use(authMiddleware);
router.post("/razorpay/order", idempotencyMiddleware(), createRazorpayOrderController);
// Documentation-compatible aliases; existing Android clients keep using /razorpay/*.
router.post("/orders", idempotencyMiddleware(), createRazorpayOrderController);
router.post("/razorpay/verify", idempotencyMiddleware(), verifyRazorpayPaymentController);
router.post("/:id/verify", idempotencyMiddleware(), verifyRazorpayPaymentController);
router.post("/", idempotencyMiddleware(), createPaymentController);
router.get("/", listPaymentsController);
router.get("/:id", getPaymentController);
router.post("/:id/refunds", idempotencyMiddleware(), createRefundController);
router.post("/:id/refund", idempotencyMiddleware(), createRefundController);
export default router;
