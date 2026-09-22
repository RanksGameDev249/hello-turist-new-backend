import { Request, Response, NextFunction } from "express";

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function rejectOversizedJson(req: Request, res: Response, next: NextFunction) {
  const length = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(length) && length > 2_000_000) return res.status(413).json({ error: "Request body too large" });
  next();
}
