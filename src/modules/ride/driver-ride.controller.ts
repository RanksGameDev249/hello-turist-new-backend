import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { prisma } from "../../core/prisma";

export async function listDriverRidesController(req: Request, res: Response) {
  try {
    const items = await prisma.ride.findMany({
      where: { assignments: { some: { driverId: req.user!.id, status: { in: ["OFFERED", "ACCEPTED"] } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { assignments: { where: { driverId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return successResponse(res, req.requestId, items);
  } catch {
    return errorResponse(res, req.requestId, 500, "INTERNAL_ERROR", "Could not load driver rides");
  }
}
