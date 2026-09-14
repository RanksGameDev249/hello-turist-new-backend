import { Request, Response, NextFunction } from "express";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("UNHANDLED_ERROR:", error);

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