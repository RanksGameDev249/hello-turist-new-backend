import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export async function getFinanceSummary(req: Request, res: Response) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return res.status(400).json({ error: "Invalid date range" });
  }
  if (from && to && from > to) return res.status(400).json({ error: "from must be before to" });

  const where = { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
  const [payments, successful, refunded, failed] = await Promise.all([
    prisma.payment.aggregate({ where, _count: true, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, status: "CAPTURED" }, _count: true, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, status: "REFUNDED" }, _count: true, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, status: "FAILED" }, _count: true, _sum: { amount: true } }),
  ]);
  return res.json({ period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null }, totals: { count: payments._count, amount: payments._sum.amount ?? 0 }, captured: { count: successful._count, amount: successful._sum.amount ?? 0 }, refunded: { count: refunded._count, amount: refunded._sum.amount ?? 0 }, failed: { count: failed._count, amount: failed._sum.amount ?? 0 } });
}
