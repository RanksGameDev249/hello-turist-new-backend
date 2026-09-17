import crypto from "node:crypto";
import { prisma } from "../../core/prisma";
import { NotificationType, Prisma } from "../../generated/prisma/client";
import { calculateFare } from "../ride/fare.service";
import type { CreatePaymentInput, CreateRefundInput, PaymentWebhookInput, VerifyRazorpayPaymentInput } from "./payment.schema";

const paymentInclude = { refunds: { orderBy: { createdAt: "desc" as const } }, ride: { select: { id: true, riderId: true, status: true } } } as const;

async function sendPaymentNotification(userId: string, title: string, body: string, data: Prisma.InputJsonValue) {
  try { await prisma.notification.create({ data: { userId, type: NotificationType.PAYMENT_UPDATE, title, body, data } }); } catch { /* notifications must not break payment */ }
}

function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");
  return { keyId, keySecret };
}

async function razorpayRequest(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = razorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, ...(init.headers ?? {}) } });
  const text = await response.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* handled below */ }
  if (!response.ok) throw new Error("RAZORPAY_REQUEST_FAILED");
  return data;
}

export async function createRazorpayOrder(userId: string, rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId) throw new Error("FORBIDDEN");
  if (ride.status === "CANCELLED") throw new Error("RIDE_CANCELLED");
  const fare = await calculateFare({ latitude: Number(ride.pickupLatitude), longitude: Number(ride.pickupLongitude) }, { latitude: Number(ride.dropoffLatitude), longitude: Number(ride.dropoffLongitude) });
  if (fare.currency !== "INR") throw new Error("RAZORPAY_CURRENCY_UNSUPPORTED");
  const existing = await prisma.payment.findUnique({ where: { rideId } });
  if (existing) {
    const metadata = (existing.metadata ?? {}) as Record<string, any>;
    if (existing.provider === "RAZORPAY" && metadata.razorpayOrderId) return { payment: existing, keyId: razorpayConfig().keyId, orderId: metadata.razorpayOrderId, amount: Math.round(Number(existing.amount) * 100), currency: existing.currency };
    throw new Error("PAYMENT_ALREADY_EXISTS");
  }
  const amount = Math.round(fare.totalFare * 100);
  const order = await razorpayRequest("/orders", { method: "POST", body: JSON.stringify({ amount, currency: fare.currency, receipt: `ride_${rideId}`.slice(0, 40), notes: { rideId } }) });
  if (!order?.id) throw new Error("RAZORPAY_ORDER_INVALID");
  const payment = await prisma.payment.create({ data: { rideId, payerId: userId, amount: fare.totalFare, currency: fare.currency, provider: "RAZORPAY", status: "PENDING", metadata: { fare, razorpayOrderId: order.id, razorpayAmount: amount } }, include: paymentInclude });
  return { payment, keyId: razorpayConfig().keyId, orderId: order.id, amount, currency: fare.currency };
}

export async function verifyRazorpayPayment(userId: string, input: VerifyRazorpayPaymentInput) {
  const payment = await prisma.payment.findFirst({ where: { payerId: userId, provider: "RAZORPAY", metadata: { path: ["razorpayOrderId"], equals: input.razorpayOrderId } }, include: paymentInclude });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status === "CAPTURED") return payment;
  const metadata = (payment.metadata ?? {}) as Record<string, any>;
  if (metadata.razorpayOrderId !== input.razorpayOrderId) throw new Error("PAYMENT_ORDER_MISMATCH");
  const secret = razorpayConfig().keySecret;
  const expected = crypto.createHmac("sha256", secret).update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest("hex");
  if (expected.length !== input.razorpaySignature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpaySignature))) throw new Error("RAZORPAY_SIGNATURE_INVALID");
  const providerPayment = await razorpayRequest(`/payments/${encodeURIComponent(input.razorpayPaymentId)}`);
  if (providerPayment?.order_id !== input.razorpayOrderId) throw new Error("PAYMENT_ORDER_MISMATCH");
  if (Number(providerPayment?.amount) !== Math.round(Number(payment.amount) * 100)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  const providerStatus = String(providerPayment?.status || "").toLowerCase();
  if (providerStatus !== "captured" && providerStatus !== "authorized") throw new Error("PAYMENT_NOT_SUCCESSFUL");
  const status = providerStatus === "captured" ? "CAPTURED" : "AUTHORIZED";
  const updated = await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: input.razorpayPaymentId, status, paidAt: status === "CAPTURED" ? new Date() : undefined, metadata: { ...metadata, razorpayPaymentId: input.razorpayPaymentId } }, include: paymentInclude });
  if (status === "CAPTURED") await sendPaymentNotification(userId, "Payment successful", "Your Razorpay payment was completed successfully.", { event: "PAYMENT_SUCCESS", paymentId: payment.id, rideId: payment.rideId });
  return updated;
}

export async function createPayment(userId: string, input: CreatePaymentInput) {
  const ride = await prisma.ride.findUnique({ where: { id: input.rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId) throw new Error("FORBIDDEN");
  if (ride.status === "CANCELLED") throw new Error("RIDE_CANCELLED");
  const existing = await prisma.payment.findUnique({ where: { rideId: input.rideId } });
  if (existing) throw new Error("PAYMENT_ALREADY_EXISTS");
  const fare = await calculateFare({ latitude: Number(ride.pickupLatitude), longitude: Number(ride.pickupLongitude) }, { latitude: Number(ride.dropoffLatitude), longitude: Number(ride.dropoffLongitude) });
  if (input.currency !== fare.currency || Math.abs(input.amount - fare.totalFare) > 0.01) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  return prisma.payment.create({ data: { rideId: input.rideId, payerId: userId, amount: fare.totalFare, currency: fare.currency, provider: input.provider, metadata: { ...(input.metadata ?? {}), fare } }, include: paymentInclude });
}

export async function getPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.payerId !== userId) throw new Error("FORBIDDEN");
  return payment;
}

export async function listPayments(userId: string) { return prisma.payment.findMany({ where: { payerId: userId }, orderBy: { createdAt: "desc" }, include: paymentInclude }); }

export async function createRefund(userId: string, paymentId: string, input: CreateRefundInput) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.payerId !== userId) throw new Error("FORBIDDEN");
    if (payment.provider !== "RAZORPAY") throw new Error("REFUND_PROVIDER_UNSUPPORTED");
    if (payment.status !== "CAPTURED") throw new Error("PAYMENT_NOT_REFUNDABLE");
    if (!payment.providerPaymentId) throw new Error("PAYMENT_PROVIDER_ID_MISSING");
    if (payment.refunds.some((refund) => refund.status === "PENDING")) throw new Error("REFUND_ALREADY_PROCESSING");
    const alreadyRefunded = payment.refunds.reduce((sum, refund) => refund.status !== "FAILED" ? sum + Number(refund.amount) : sum, 0);
    const refundAmount = input.amount ?? (Number(payment.amount) - alreadyRefunded);
    if (refundAmount <= 0 || refundAmount > Number(payment.amount) - alreadyRefunded) throw new Error("INVALID_REFUND_AMOUNT");
    const refund = await tx.refund.create({ data: { paymentId, amount: refundAmount, reason: input.reason } });
    return { refund, payerId: payment.payerId, rideId: payment.rideId, providerPaymentId: payment.providerPaymentId, paymentAmount: Number(payment.amount), alreadyRefunded };
  });

  let providerRefund: any;
  try {
    providerRefund = await razorpayRequest(`/payments/${encodeURIComponent(result.providerPaymentId)}/refund`, {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(Number(result.refund.amount) * 100),
        receipt: `refund_${result.refund.id}`.slice(0, 40),
        notes: { paymentId, refundId: result.refund.id, rideId: result.rideId, reason: input.reason ?? "" },
      }),
    });
  } catch (error) {
    await prisma.refund.update({ where: { id: result.refund.id }, data: { status: "FAILED" } });
    await sendPaymentNotification(result.payerId, "Refund failed", "Your refund could not be processed by Razorpay. Please try again or contact support.", { event: "REFUND_FAILED", paymentId, refundId: result.refund.id, rideId: result.rideId });
    if (error instanceof Error && error.message === "RAZORPAY_NOT_CONFIGURED") throw error;
    throw new Error("RAZORPAY_REFUND_FAILED");
  }

  const providerStatus = String(providerRefund?.status || "pending").toLowerCase();
  const status = providerStatus === "processed" ? "PROCESSED" : providerStatus === "failed" ? "FAILED" : "PENDING";
  const refund = await prisma.$transaction(async (tx) => {
    const updatedRefund = await tx.refund.update({ where: { id: result.refund.id }, data: { status, providerRefundId: providerRefund?.id ?? undefined } });
    if (status === "PROCESSED") {
      const refunds = await tx.refund.findMany({ where: { paymentId, status: { not: "FAILED" } } });
      const refundedTotal = refunds.reduce((sum, item) => sum + Number(item.amount), 0);
      if (refundedTotal >= result.paymentAmount) await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
    }
    return updatedRefund;
  });

  const event = status === "PROCESSED" ? "REFUND_PROCESSED" : status === "FAILED" ? "REFUND_FAILED" : "REFUND_PENDING";
  const title = status === "PROCESSED" ? "Refund processed" : status === "FAILED" ? "Refund failed" : "Refund pending";
  const body = status === "PROCESSED" ? "Your Razorpay refund has been processed." : status === "FAILED" ? "Your Razorpay refund failed. Please contact support if needed." : "Your Razorpay refund has been submitted and is pending processing.";
  await sendPaymentNotification(result.payerId, title, body, { event, paymentId, refundId: refund.id, rideId: result.rideId, providerRefundId: refund.providerRefundId ?? null });
  return refund;
}

export async function applyPaymentWebhook(input: PaymentWebhookInput) {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId: input.providerPaymentId } });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status === "REFUNDED" || payment.status === input.status) return payment;
  const data: { status: "AUTHORIZED" | "CAPTURED" | "FAILED"; paidAt?: Date; failedAt?: Date; metadata?: Prisma.InputJsonValue } = { status: input.status, ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}) };
  if (input.status === "CAPTURED") data.paidAt = new Date();
  if (input.status === "FAILED") data.failedAt = new Date();
  return prisma.payment.update({ where: { id: payment.id }, data });
}
