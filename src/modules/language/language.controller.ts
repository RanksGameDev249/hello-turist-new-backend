import { Request, Response } from "express";
import { z } from "zod";
import { getCurrentUser, updatePreferredLanguage } from "../users/users.service";
import { isSupportedLanguage } from "./language.catalog";

const schema = z.object({ language: z.string().trim().min(2).max(10).refine(isSupportedLanguage, "Unsupported language") });

export async function getMyLanguage(req: Request, res: Response) {
  try {
    const user = await getCurrentUser(req.user.id);
    return res.status(200).json({ success: true, data: { language: user.preferredLanguage }, error: null, requestId: req.requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, data: null, error: { code: "USER_NOT_FOUND", message: "User not found" }, requestId: req.requestId });
    }
    throw error;
  }
}

export async function setMyLanguage(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: "UNSUPPORTED_LANGUAGE", message: "Unsupported language" }, requestId: req.requestId });
  try {
    const language = await updatePreferredLanguage(req.user.id, parsed.data.language);
    return res.status(200).json({ success: true, data: language, error: null, requestId: req.requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "UNSUPPORTED_LANGUAGE") return res.status(400).json({ success: false, data: null, error: { code: error.message, message: "Unsupported language" }, requestId: req.requestId });
    throw error;
  }
}
