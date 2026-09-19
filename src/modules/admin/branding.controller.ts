import { Request, Response } from "express";
import { getBranding, updateBranding } from "./branding.service";

export async function getBrandingController(_req: Request, res: Response) { return res.json({ success: true, data: await getBranding(), error: null }); }
export async function updateBrandingController(req: Request, res: Response) {
  try { return res.json({ success: true, data: await updateBranding(req.body), error: null }); }
  catch (e) { return res.status(400).json({ success: false, data: null, error: { code: e instanceof Error ? e.message : "INVALID_BRANDING" } }); }
}
