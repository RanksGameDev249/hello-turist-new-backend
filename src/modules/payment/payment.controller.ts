import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createPaymentSchema, createRefundSchema, paymentWebhookSchema } from "./payment.schema";
import { applyPaymentWebhook, createPayment, createRefund, getPayment, listPayments } from "./payment.service";

function getPaymentId(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") throw new Error("INVALID_PAYMENT_ID");
  return id;
}

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND: [404, "Ride not found"], FORBIDDEN: [403, "You do not have access to this payment"],
    RIDE_CANCELLED: [409, "Ride is cancelled"], PAYMENT_ALREADY_EXISTS: [409, "Payment already exists for this ride"],
    PAYMENT_NOT_FOUND: [404, "Payment not found"], PAYMENT_NOT_REFUNDABLE: [409, "Payment is not refundable"],
    INVALID_REFUND_AMOUNT: [400, "Invalid refund amount"], INVALID_PAYMENT_ID: [400, "Invalid payment id"],
    PAYMENT_AMOUNT_MISMATCH: [409, "Payment amount does not match the current server fare"],
    RIDE_PRICING_CONFIG_MISSING: [503, "Ride pricing is not configured"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function createPaymentController(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid payment data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await createPayment(req.user!.id, parsed.data), 201); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function listPaymentsController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await listPayments(req.user!.id)); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function getPaymentController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await getPayment(req.user!.id, getPaymentId(req))); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function createRefundController(req: Request, res: Response) {
  const parsed = createRefundSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid refund data", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await createRefund(req.user!.id, getPaymentId(req), parsed.data), 201); } catch (e) { return handleError(res, req.requestId, e); }
}

export async function paymentWebhookController(req: Request, res: Response) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || req.header("x-payment-webhook-secret") !== secret) return errorResponse(res, req.requestId, 401, "UNAUTHORIZED", "Invalid payment webhook credentials");
  const parsed = paymentWebhookSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid payment webhook", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await applyPaymentWebhook(parsed.data)); } catch (e) { return handleError(res, req.requestId, e); }
}
