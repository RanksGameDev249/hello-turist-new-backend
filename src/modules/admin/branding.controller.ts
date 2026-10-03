import { Request, Response } from "express";
import { getBranding, updateBranding } from "./branding.service";
import { writeAuditLog } from "./audit.service";

export async function getBrandingController(req: Request, res: Response) {
  try {
    return res.status(200).json({ success: true, data: await getBranding(), error: null, requestId: req.requestId });
  } catch (error) {
    console.error("ADMIN_BRANDING_GET_ERROR:", error);
    return res.status(500).json({ success: false, data: null, error: { code: "BRANDING_READ_FAILED", message: "Unable to load branding" }, requestId: req.requestId });
  }
}

export async function updateBrandingController(req: Request, res: Response) {
  try {
    const data = await updateBranding(req.body);
    await writeAuditLog({ actorUserId: req.user!.id, action: "BRANDING_UPDATED", entityType: "APP_SETTING", metadata: { setting: "APP_BRANDING", appName: data.appName, hasLogo: Boolean(data.logoUrl), hasIcon: Boolean(data.iconUrl) }, requestId: req.requestId });
    return res.status(200).json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_BRANDING";
    return res.status(400).json({ success: false, data: null, error: { code, message: "Invalid branding configuration" }, requestId: req.requestId });
  }
}
