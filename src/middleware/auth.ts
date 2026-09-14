import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { prisma } from "../core/prisma";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        username: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      requestId: req.requestId,
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as {
      sub: string;
      username: string;
    };

    if (!decoded.sub || !decoded.username) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_ACCESS_TOKEN",
          message: "Invalid access token",
        },
        requestId: req.requestId,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        username: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "ACCOUNT_NOT_ACTIVE",
          message: "Account is not active",
        },
        requestId: req.requestId,
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "INVALID_ACCESS_TOKEN",
        message: "Invalid or expired access token",
      },
      requestId: req.requestId,
    });
  }
}