import { Response } from "express";

export function successResponse(
  res: Response,
  requestId: string,
  data: unknown,
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    requestId,
  });
}

export function errorResponse(
  res: Response,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
    requestId,
  });
}