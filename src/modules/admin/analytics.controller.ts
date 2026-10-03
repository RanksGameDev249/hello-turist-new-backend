import { Request, Response } from "express";
import { prisma } from "../../core/prisma";

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function getAdminAnalytics(req: Request, res: Response) {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);

  if ((req.query.from && !from) || (req.query.to && !to) || (from && to && from > to)) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "INVALID_DATE_RANGE", message: "Invalid analytics date range" },
      requestId: req.requestId,
    });
  }

  const createdAt = from || to
    ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
    : undefined;

  try {
    const [
      users,
      activeUsers,
      drivers,
      guides,
      rides,
      payments,
      verifications,
      tickets,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt, deletedAt: null } }),
      prisma.user.count({ where: { createdAt, status: "ACTIVE", deletedAt: null } }),
      prisma.userRoleAssignment.count({
        where: {
          createdAt,
          role: "DRIVER",
          verificationStatus: { in: ["VERIFIED", "APPROVED"] },
          user: { deletedAt: null },
        },
      }),
      prisma.userRoleAssignment.count({
        where: {
          createdAt,
          role: "GUIDE",
          verificationStatus: { in: ["VERIFIED", "APPROVED"] },
          user: { deletedAt: null },
        },
      }),
      prisma.ride.count({ where: { createdAt } }),
      prisma.payment.count({ where: { createdAt } }),
      prisma.verificationRequest.count({ where: { createdAt } }),
      prisma.supportTicket.count({ where: { createdAt } }),
    ]);

    const [rideByStatus, paymentByStatus, verificationByStatus, ticketByStatus] =
      await Promise.all([
        prisma.ride.groupBy({
          by: ["status"],
          where: { createdAt },
          _count: { _all: true },
        }),
        prisma.payment.groupBy({
          by: ["status"],
          where: { createdAt },
          _count: { _all: true },
        }),
        prisma.verificationRequest.groupBy({
          by: ["status"],
          where: { createdAt },
          _count: { _all: true },
        }),
        prisma.supportTicket.groupBy({
          by: ["status"],
          where: { createdAt },
          _count: { _all: true },
        }),
      ]);

    return res.json({
      success: true,
      data: {
        range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
        kpis: {
          users,
          activeUsers,
          approvedDrivers: drivers,
          approvedGuides: guides,
          rides,
          payments,
          verificationRequests: verifications,
          supportTickets: tickets,
        },
        breakdowns: {
          rides: Object.fromEntries(rideByStatus.map((row) => [row.status, row._count._all])),
          payments: Object.fromEntries(paymentByStatus.map((row) => [row.status, row._count._all])),
          verificationRequests: Object.fromEntries(
            verificationByStatus.map((row) => [row.status, row._count._all]),
          ),
          supportTickets: Object.fromEntries(
            ticketByStatus.map((row) => [row.status, row._count._all]),
          ),
        },
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    console.error("ADMIN_ANALYTICS_ERROR:", error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: "ADMIN_ANALYTICS_FAILED",
        message: "Unable to load admin analytics",
      },
      requestId: req.requestId,
    });
  }
}
