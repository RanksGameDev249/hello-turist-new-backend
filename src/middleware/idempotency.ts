import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { connectRedis, redis } from "../core/redis";
import { errorResponse } from "../core/api-response";

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const IN_PROGRESS_TTL_SECONDS = 60;

type StoredResponse = {
  statusCode: number;
  body: unknown;
  fingerprint: string;
};

function getKey(req: Request) {
  const raw = req.header("Idempotency-Key")?.trim();
  return raw && raw.length <= 255 ? raw : null;
}

function fingerprint(req: Request) {
  return crypto
    .createHash("sha256")
    .update(req.method)
    .update("\n")
    .update(req.originalUrl)
    .update("\n")
    .update(JSON.stringify(req.body ?? null))
    .digest("hex");
}

export function idempotencyMiddleware(ttlSeconds = DEFAULT_TTL_SECONDS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req);
    if (!key) {
      return errorResponse(
        res,
        req.requestId,
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Idempotency-Key header is required for this operation",
      );
    }

    try {
      await connectRedis();
      const storageKey = `idempotency:${req.user?.id ?? "anonymous"}:${crypto.createHash("sha256").update(req.originalUrl).digest("hex")}:${key}`;
      const requestFingerprint = fingerprint(req);
      const existing = await redis.get(storageKey);

      if (existing) {
        const parsed = JSON.parse(existing) as StoredResponse | { inProgress: true; fingerprint: string };
        if ("inProgress" in parsed) {
          if (parsed.fingerprint !== requestFingerprint) {
            return errorResponse(res, req.requestId, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with different request data");
          }
          return errorResponse(res, req.requestId, 409, "IDEMPOTENCY_IN_PROGRESS", "The original request is still being processed");
        }
        if (parsed.fingerprint !== requestFingerprint) {
          return errorResponse(res, req.requestId, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with different request data");
        }
        return res.status(parsed.statusCode).json(parsed.body);
      }

      const claimed = await redis.set(
        storageKey,
        JSON.stringify({ inProgress: true, fingerprint: requestFingerprint }),
        { NX: true, EX: IN_PROGRESS_TTL_SECONDS },
      );
      if (claimed !== "OK") {
        return errorResponse(res, req.requestId, 409, "IDEMPOTENCY_IN_PROGRESS", "The original request is still being processed");
      }

      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        const statusCode = res.statusCode;
        void redis.set(
          storageKey,
          JSON.stringify({ statusCode, body, fingerprint: requestFingerprint } satisfies StoredResponse),
          { EX: ttlSeconds },
        ).catch((error) => console.error("IDEMPOTENCY_STORE_ERROR:", error));
        return originalJson(body);
      }) as typeof res.json;

      res.once("close", () => {
        if (!res.writableEnded) {
          void redis.del(storageKey).catch(() => undefined);
        }
      });

      return next();
    } catch (error) {
      console.error("IDEMPOTENCY_ERROR:", error);
      return errorResponse(res, req.requestId, 503, "IDEMPOTENCY_UNAVAILABLE", "Idempotency protection is temporarily unavailable");
    }
  };
}
