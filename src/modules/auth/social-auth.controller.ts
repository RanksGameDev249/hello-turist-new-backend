import { Request, Response } from "express";
import { z } from "zod";
import { linkOrLoginWithFirebasePhone, loginWithGoogle } from "./social-auth.service";

const googleSchema = z.object({ idToken: z.string().min(1), nonce: z.string().min(16) });
const firebasePhoneSchema = z.object({ idToken: z.string().min(1) });

export async function googleSignIn(req: Request, res: Response) {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: "Google ID token and nonce are required" }, requestId: req.requestId });
  try {
    const result = await loginWithGoogle(parsed.data.idToken, parsed.data.nonce);
    return res.status(200).json({ success: true, data: result, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const status = code === "ACCOUNT_NOT_ACTIVE" ? 403 : code === "GOOGLE_ACCOUNT_CONFLICT" ? 409 : code === "INVALID_GOOGLE_TOKEN" ? 401 : 500;
    const message = code === "INVALID_GOOGLE_TOKEN" ? "Invalid or unverified Google account" : code === "GOOGLE_ACCOUNT_CONFLICT" ? "Google account is linked to another user" : code === "ACCOUNT_NOT_ACTIVE" ? "Account is not active" : "Google sign-in failed";
    console.error("GOOGLE_SIGN_IN_ERROR:", error);
    return res.status(status).json({ success: false, data: null, error: { code, message }, requestId: req.requestId });
  }
}

export async function firebasePhoneAuth(req: Request, res: Response) {
  const parsed = firebasePhoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: "Firebase ID token is required" }, requestId: req.requestId });
  try {
    const result = await linkOrLoginWithFirebasePhone(parsed.data.idToken, req.user?.id);
    return res.status(200).json({ success: true, data: result, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
    const statusMap: Record<string, number> = { FIREBASE_NOT_CONFIGURED: 500, INVALID_FIREBASE_TOKEN: 401, INVALID_FIREBASE_PHONE_ACCOUNT: 401, PHONE_ACCOUNT_ALREADY_LINKED: 409, PHONE_ALREADY_REGISTERED: 409, ACCOUNT_NOT_ACTIVE: 403 };
    const messageMap: Record<string, string> = { FIREBASE_NOT_CONFIGURED: "Firebase phone authentication is not configured on the server", INVALID_FIREBASE_TOKEN: "Invalid Firebase authentication token", INVALID_FIREBASE_PHONE_ACCOUNT: "A verified Firebase phone account is required", PHONE_ACCOUNT_ALREADY_LINKED: "This Firebase phone account belongs to another user", PHONE_ALREADY_REGISTERED: "This phone number is already registered", ACCOUNT_NOT_ACTIVE: "Account is not active" };
    console.error("FIREBASE_PHONE_AUTH_ERROR:", error);
    return res.status(statusMap[code] ?? 500).json({ success: false, data: null, error: { code, message: messageMap[code] ?? "Phone authentication failed" }, requestId: req.requestId });
  }
}
