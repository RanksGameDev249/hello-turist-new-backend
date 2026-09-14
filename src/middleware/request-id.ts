import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  req.requestId = randomUUID();
  next();
}