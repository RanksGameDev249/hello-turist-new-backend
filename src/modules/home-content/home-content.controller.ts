import { Request, Response } from "express";
import { getAdminHomeBanner, getHomeBanner, updateHomeBanner } from "./home-content.service";
import { writeAuditLog } from "../admin/audit.service";

export async function getHomeBannerController(req: Request, res: Response) {
  try {
    return res.status(200).json({ success: true, data: await getHomeBanner(), error: null, requestId: req.requestId });
  } catch (error) {
    console.error("HOME_BANNER_GET_ERROR:", error);
    return res.status(500).json({ success: false, data: null, error: { code: "HOME_BANNER_READ_FAILED", message: "Unable to load home banner" }, requestId: req.requestId });
  }
}

export async function getAdminHomeBannerController(req: Request, res: Response) {
  try {
    return res.status(200).json({ success: true, data: await getAdminHomeBanner(), error: null, requestId: req.requestId });
  } catch (error) {
    console.error("ADMIN_HOME_BANNER_GET_ERROR:", error);
    return res.status(500).json({ success: false, data: null, error: { code: "HOME_BANNER_READ_FAILED", message: "Unable to load home banner" }, requestId: req.requestId });
  }
}

export async function updateHomeBannerController(req: Request, res: Response) {
  try {
    const data = await updateHomeBanner(req.body);
    await writeAuditLog({ actorUserId: req.user!.id, action: "HOME_BANNER_UPDATED", entityType: "APP_SETTING", metadata: { setting: "HOME_BANNER", isActive: data.isActive, hasImage: Boolean(data.imageUrl), ctaAction: data.ctaAction }, requestId: req.requestId });
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_HOME_BANNER";
    return res.status(400).json({ success: false, data: null, error: { code, message: "Invalid home banner configuration" }, requestId: req.requestId });
  }
}
