import { prisma } from "../../core/prisma";
import type { CreatePaymentInput, CreateRefundInput, PaymentWebhookInput } from "./payment.schema";

const paymentInclude = {
  refunds: { orderBy: { createdAt: "desc" as const } },
  ride: { select: { id: true, riderId: true, status: true } },
} as const;

export async function createPayment(userId: string, input: CreatePaymentInput) {
  const ride = await prisma.ride.findUnique({ where: { id: input.rideId } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  if (ride.riderId !== userId) throw new Error("FORBIDDEN");
  if (ride.status === "CANCELLED") throw new Error("RIDE_CANCELLED");

  const existing = await prisma.payment.findUnique({ where: { rideId: input.rideId } });
  if (existing) throw new Error("PAYMENT_ALREADY_EXISTS");

  return prisma.payment.create({
    data: {
      rideId: input.rideId,
      payerId: userId,
      amount: input.amount,
      currency: input.currency,
      provider: input.provider,
      metadata: input.metadata,
    },
    include: paymentInclude,
  });
}

export async function getPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.payerId !== userId) throw new Error("FORBIDDEN");
  return payment;
}

export async function listPayments(userId: string) {
  return prisma.payment.findMany({
    where: { payerId: userId },
    orderBy: { createdAt: "desc" },
    include: paymentInclude,
  });
}

export async function createRefund(userId: string, paymentId: string, input: CreateRefundInput) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.payerId !== userId) throw new Error("FORBIDDEN");
    if (payment.status !== "CAPTURED") throw new Error("PAYMENT_NOT_REFUNDABLE");

    const alreadyRefunded = payment.refunds.reduce((sum, refund) =>
      refund.status !== "FAILED" ? sum + Number(refund.amount) : sum, 0);
    const refundAmount = input.amount ?? (Number(payment.amount) - alreadyRefunded);
    if (refundAmount <= 0 || refundAmount > Number(payment.amount) - alreadyRefunded) {
      throw new Error("INVALID_REFUND_AMOUNT");
    }

    return tx.refund.create({
      data: { paymentId, amount: refundAmount, reason: input.reason },
    });
  });
}

export async function applyPaymentWebhook(input: PaymentWebhookInput) {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId: input.providerPaymentId } });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  if (payment.status === "REFUNDED") return payment;
  if (payment.status === input.status) return payment;

  const data: { status: "AUTHORIZED" | "CAPTURED" | "FAILED"; paidAt?: Date; failedAt?: Date; metadata?: object } = {
    status: input.status,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
  if (input.status === "CAPTURED") data.paidAt = new Date();
  if (input.status === "FAILED") data.failedAt = new Date();

  return prisma.payment.update({ where: { id: payment.id }, data });
}
