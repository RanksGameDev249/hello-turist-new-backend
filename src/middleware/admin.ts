import { Request, Response, NextFunction } from "express";

import { prisma } from "../core/prisma";

export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        status: true,
        roles: {
          where: {
            role: "ADMIN",
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Access denied",
        },
        requestId: req.requestId,
      });
    }

    if (user.roles.length === 0) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "ADMIN_ACCESS_REQUIRED",
          message: "Admin access required",
        },
        requestId: req.requestId,
      });
    }

    next();
  } catch (error) {
    console.error("ADMIN_MIDDLEWARE_ERROR:", error);

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      requestId: req.requestId,
    });
  }
}