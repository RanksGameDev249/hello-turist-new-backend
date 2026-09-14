import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createPaymentSchema, createRefundSchema, paymentWebhookSchema } from "./payment.schema";
import { applyPaymentWebhook, createPayment, createRefund, getPayment, listPayments } from "./payment.service";

function getPaymentId(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") throw new Error("INVALID_PAYMENT_ID");
  return id;
}

export async function createPaymentController(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", "Invalid payment data"));
  try {
    const payment = await createPayment(req.user!.id, parsed.data);
    return res.status(201).json(successResponse(req, payment));
  } catch (error) {
    return res.status(error instanceof Error && error.message === "FORBIDDEN" ? 403 : 400)
      .json(errorResponse(req, error instanceof Error ? error.message : "PAYMENT_CREATE_FAILED", "Unable to create payment"));
  }
}

export async function listPaymentsController(req: Request, res: Response) {
  const payments = await listPayments(req.user!.id);
  return res.status(200).json(successResponse(req, payments));
}

export async function getPaymentController(req: Request, res: Response) {
  try {
    const payment = await getPayment(req.user!.id, getPaymentId(req));
    return res.status(200).json(successResponse(req, payment));
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_NOT_FOUND";
    return res.status(code === "FORBIDDEN" ? 403 : 404).json(errorResponse(req, code, "Unable to fetch payment"));
  }
}

export async function createRefundController(req: Request, res: Response) {
  const parsed = createRefundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", "Invalid refund data"));
  try {
    const refund = await createRefund(req.user!.id, getPaymentId(req), parsed.data);
    return res.status(201).json(successResponse(req, refund));
  } catch (error) {
    const code = error instanceof Error ? error.message : "REFUND_CREATE_FAILED";
    return res.status(code === "FORBIDDEN" ? 403 : 400).json(errorResponse(req, code, "Unable to create refund"));
  }
}

export async function paymentWebhookController(req: Request, res: Response) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || req.header("x-payment-webhook-secret") !== secret) {
    return res.status(401).json(errorResponse(req, "UNAUTHORIZED", "Invalid payment webhook credentials"));
  }
  const parsed = paymentWebhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", "Invalid payment webhook"));
  try {
    const payment = await applyPaymentWebhook(parsed.data);
    return res.status(200).json(successResponse(req, payment));
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_WEBHOOK_FAILED";
    return res.status(404).json(errorResponse(req, code, "Unable to process payment webhook"));
  }
}
