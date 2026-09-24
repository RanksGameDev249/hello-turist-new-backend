import { Request, Response } from "express";
import { z } from "zod";

import { requestOtp, verifyFirebasePhoneToken } from "./otp.service";

const requestSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

const verifySchema = z.object({
  idToken: z.string().trim().min(20),
  phone: z.string().trim().min(8).max(20).optional(),
});

function errorResponse(res: Response, req: Request, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, data: null, error: { code, message }, requestId: req.requestId });
}

export async function requestOtpController(req: Request, res: Response) {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req, 400, "VALIDATION_ERROR", "A valid mobile number is required");

  try {
    const data = await requestOtp(parsed.data.phone);
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const known: Record<string, [number, string]> = {
      INVALID_PHONE_NUMBER: [400, "Enter a valid mobile number"],
      PHONE_NOT_REGISTERED: [404, "No active account is registered with this mobile number"],
    };
    const [status, message] = known[code] ?? [500, "Something went wrong"];
    if (status >= 500) console.error("OTP_REQUEST_ERROR:", error);
    return errorResponse(res, req, status, code, message);
  }
}

export async function verifyOtpController(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req, 400, "VALIDATION_ERROR", "A Firebase ID token is required after phone verification");

  try {
    const data = await verifyFirebasePhoneToken(parsed.data.idToken, parsed.data.phone);
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const known: Record<string, [number, string]> = {
      INVALID_FIREBASE_ID_TOKEN: [401, "The Firebase phone verification could not be verified"],
      FIREBASE_ADMIN_NOT_CONFIGURED: [503, "Firebase authentication is not configured on the server"],
      FIREBASE_CERTIFICATE_FETCH_FAILED: [503, "Firebase verification is temporarily unavailable"],
      FIREBASE_PHONE_NUMBER_MISSING: [401, "The Firebase account is not a verified phone account"],
      PHONE_MISMATCH: [401, "The verified phone number does not match the requested number"],
      PHONE_NOT_REGISTERED: [404, "No active account is registered with this mobile number"],
      PHONE_ALREADY_EXISTS: [409, "Phone number is already registered to another account"],
      ACCOUNT_NOT_ACTIVE: [403, "Account is not active"],
      USER_NOT_FOUND: [404, "User account was not found"],
    };
    const [status, message] = known[code] ?? [500, "Something went wrong"];
    if (status >= 500) console.error("OTP_VERIFY_ERROR:", error);
    return errorResponse(res, req, status, code, message);
  }
}

/**
 * Compatibility endpoint for Android clients that complete Firebase Phone Auth
 * directly and then exchange the verified Firebase ID token for an app session.
 * This is the same server-side verification contract as /auth/otp/verify.
 */
export async function firebasePhoneController(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, req, 400, "VALIDATION_ERROR", "A Firebase ID token is required after phone verification");
  }

  try {
    const data = await verifyFirebasePhoneToken(parsed.data.idToken, parsed.data.phone);
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const known: Record<string, [number, string]> = {
      INVALID_FIREBASE_ID_TOKEN: [401, "The Firebase phone verification could not be verified"],
      FIREBASE_ADMIN_NOT_CONFIGURED: [503, "Firebase authentication is not configured on the server"],
      FIREBASE_CERTIFICATE_FETCH_FAILED: [503, "Firebase verification is temporarily unavailable"],
      FIREBASE_PHONE_NUMBER_MISSING: [401, "The Firebase account is not a verified phone account"],
      PHONE_MISMATCH: [401, "The verified phone number does not match the requested number"],
      PHONE_NOT_REGISTERED: [404, "No active account is registered with this mobile number"],
      PHONE_ALREADY_EXISTS: [409, "Phone number is already registered to another account"],
      ACCOUNT_NOT_ACTIVE: [403, "Account is not active"],
      USER_NOT_FOUND: [404, "User account was not found"],
    };
    const [status, message] = known[code] ?? [500, "Something went wrong"];
    if (status >= 500) console.error("FIREBASE_PHONE_AUTH_ERROR:", error);
    return errorResponse(res, req, status, code, message);
  }
}
