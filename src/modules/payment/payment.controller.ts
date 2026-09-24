import crypto from "node:crypto";
import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createPaymentSchema, createRazorpayOrderSchema, createRefundSchema, verifyRazorpayPaymentSchema } from "./payment.schema";
import { applyRazorpayWebhook, createPayment, createRazorpayOrder, createRefund, getPayment, listPayments, RazorpayRequestError, verifyRazorpayPayment } from "./payment.service";
import { claimRazorpayWebhook, markRazorpayWebhookProcessed, releaseRazorpayWebhook } from "./payment-webhook-dedup";

function getPaymentId(req: Request): string { const { id } = req.params; if (typeof id !== "string") throw new Error("INVALID_PAYMENT_ID"); return id; }
function handleError(res: Response, requestId: string, error: unknown) {
  if (error instanceof RazorpayRequestError) {
    const message =
      error.status === 401
        ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        : error.status === 403
          ? "Razorpay rejected this request. Check the Razorpay account/API permissions."
          : error.status === 400
            ? `Razorpay rejected the request: ${error.providerDescription}`
            : "Razorpay request failed. Please try again.";
    return errorResponse(res, requestId, error.status === 400 ? 400 : 502, "RAZORPAY_REQUEST_FAILED", message, {
      providerCode: error.providerCode,
      providerStatus: error.status,
    });
  }
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = { RIDE_NOT_FOUND:[404,"Ride not found"], FORBIDDEN:[403,"You do not have access to this payment"], RIDE_CANCELLED:[409,"Ride is cancelled"], PAYMENT_ALREADY_EXISTS:[409,"Payment already exists for this ride"], PAYMENT_NOT_FOUND:[404,"Payment not found"], PAYMENT_NOT_REFUNDABLE:[409,"Payment is not refundable"], INVALID_REFUND_AMOUNT:[400,"Invalid refund amount"], REFUND_PROVIDER_UNSUPPORTED:[409,"This payment provider does not support server-side refunds"], REFUND_ALREADY_PROCESSING:[409,"A refund is already being processed for this payment"], PAYMENT_PROVIDER_ID_MISSING:[409,"The provider payment id is missing; this payment cannot be refunded"], REFUND_NOT_FOUND:[404,"Refund not found"], INVALID_PAYMENT_ID:[400,"Invalid payment id"], PAYMENT_AMOUNT_MISMATCH:[409,"Payment amount does not match the current server fare"], RIDE_PRICING_CONFIG_MISSING:[503,"Ride pricing is not configured"], RAZORPAY_NOT_CONFIGURED:[503,"Razorpay is not configured on the server"], RAZORPAY_CURRENCY_UNSUPPORTED:[409,"Razorpay currently supports only INR checkout"], RAZORPAY_ORDER_INVALID:[502,"Razorpay returned an invalid order"], RAZORPAY_REQUEST_FAILED:[502,"Razorpay request failed"], RAZORPAY_REFUND_FAILED:[502,"Razorpay refund failed"], PAYMENT_ORDER_MISMATCH:[409,"Razorpay order does not match this ride"], RAZORPAY_SIGNATURE_INVALID:[401,"Razorpay payment signature is invalid"], PAYMENT_NOT_SUCCESSFUL:[409,"Razorpay payment is not successful"], INVALID_RAZORPAY_REFUND_WEBHOOK:[400,"Invalid Razorpay refund webhook"], INVALID_RAZORPAY_PAYMENT_WEBHOOK:[400,"Invalid Razorpay payment webhook"] };
  const [status, message] = map[code] ?? [500,"Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function createRazorpayOrderController(req: Request, res: Response) { const parsed=createRazorpayOrderSchema.safeParse(req.body); if(!parsed.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid Razorpay order data",parsed.error.flatten()); try{return successResponse(res,req.requestId,await createRazorpayOrder(req.user!.id,parsed.data.rideId),201);}catch(e){return handleError(res,req.requestId,e);} }
export async function verifyRazorpayPaymentController(req: Request, res: Response) { const parsed=verifyRazorpayPaymentSchema.safeParse(req.body); if(!parsed.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid Razorpay verification data",parsed.error.flatten()); try{return successResponse(res,req.requestId,await verifyRazorpayPayment(req.user!.id,parsed.data));}catch(e){return handleError(res,req.requestId,e);} }
export async function createPaymentController(req: Request, res: Response) { const parsed=createPaymentSchema.safeParse(req.body); if(!parsed.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid payment data",parsed.error.flatten()); try{return successResponse(res,req.requestId,await createPayment(req.user!.id,parsed.data),201);}catch(e){return handleError(res,req.requestId,e);} }
export async function listPaymentsController(req: Request,res: Response){try{return successResponse(res,req.requestId,await listPayments(req.user!.id));}catch(e){return handleError(res,req.requestId,e);}}
export async function getPaymentController(req: Request,res: Response){try{return successResponse(res,req.requestId,await getPayment(req.user!.id,getPaymentId(req)));}catch(e){return handleError(res,req.requestId,e);}}
export async function createRefundController(req: Request,res: Response){const parsed=createRefundSchema.safeParse(req.body);if(!parsed.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid refund data",parsed.error.flatten());try{return successResponse(res,req.requestId,await createRefund(req.user!.id,getPaymentId(req),parsed.data),201);}catch(e){return handleError(res,req.requestId,e);}}
export async function paymentWebhookController(req: Request,res: Response){
  const webhookSecret=(process.env.RAZORPAY_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET)?.trim();
  const signature=req.header("x-razorpay-signature")?.trim();
  const rawBody=(req as Request & { rawBody?: Buffer }).rawBody;
  if(!webhookSecret||!signature||!rawBody)return errorResponse(res,req.requestId,401,"UNAUTHORIZED","Invalid Razorpay webhook credentials");
  const expected=crypto.createHmac("sha256",webhookSecret).update(rawBody).digest("hex");
  const expectedBuffer=Buffer.from(expected,"utf8");
  const signatureBuffer=Buffer.from(signature,"utf8");
  if(expectedBuffer.length!==signatureBuffer.length||!crypto.timingSafeEqual(expectedBuffer,signatureBuffer))return errorResponse(res,req.requestId,401,"UNAUTHORIZED","Invalid Razorpay webhook signature");
  const eventId=req.header("x-razorpay-event-id")?.trim();
  const event=(req.body as { event?: string })?.event;
  if(!event||!eventId)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Missing Razorpay webhook event or event id");
  const claim=await claimRazorpayWebhook(eventId,event,req.body?.payload);
  if(!claim.accepted)return successResponse(res,req.requestId,{received:true,event,eventId,duplicate:true});
  try{
    const data=await applyRazorpayWebhook(event,req.body?.payload);
    await markRazorpayWebhookProcessed(eventId);
    return successResponse(res,req.requestId,{received:true,event,eventId,data});
  }catch(e){
    await releaseRazorpayWebhook(eventId);
    return handleError(res,req.requestId,e);
  }
}
