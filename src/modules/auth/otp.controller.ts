import { Request, Response } from "express";
import { z } from "zod";

import { requestOtp, verifyOtp } from "./otp.service";

const requestSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

const verifySchema = z.object({
  phone: z.string().trim().min(8).max(20),
  otp: z.string().trim().regex(/^\d{6}$/),
});

function errorResponse(res: Response, req: Request, status: number, code: string, message: string) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { code, message },
    requestId: req.requestId,
  });
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
      OTP_RATE_LIMITED: [429, "Please wait before requesting another code"],
      OTP_NOT_CONFIGURED: [503, "OTP service is not configured on the server"],
      SMS_NOT_CONFIGURED: [503, "SMS service is not configured on the server"],
      SMS_DELIVERY_FAILED: [502, "The verification code could not be delivered"],
      SMS_PROVIDER_NOT_SUPPORTED: [503, "SMS provider is not supported"],
    };
    const [status, message] = known[code] ?? [500, "Something went wrong"];
    if (status >= 500) console.error("OTP_REQUEST_ERROR:", error);
    return errorResponse(res, req, status, code, message);
  }
}

export async function verifyOtpController(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req, 400, "VALIDATION_ERROR", "Mobile number and 6-digit OTP are required");

  try {
    const data = await verifyOtp(parsed.data.phone, parsed.data.otp);
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const known: Record<string, [number, string]> = {
      INVALID_PHONE_NUMBER: [400, "Enter a valid mobile number"],
      INVALID_OTP: [401, "The verification code is incorrect"],
      OTP_EXPIRED: [410, "The verification code has expired"],
      OTP_ATTEMPTS_EXCEEDED: [429, "Too many incorrect attempts; request a new code"],
      PHONE_NOT_REGISTERED: [404, "No active account is registered with this mobile number"],
      OTP_NOT_CONFIGURED: [503, "OTP service is not configured on the server"],
    };
    const [status, message] = known[code] ?? [500, "Something went wrong"];
    if (status >= 500) console.error("OTP_VERIFY_ERROR:", error);
    return errorResponse(res, req, status, code, message);
  }
}
