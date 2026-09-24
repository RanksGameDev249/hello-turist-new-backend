import { Request, Response } from "express";
import { getAdminHomeBanner, getHomeBanner, updateHomeBanner } from "./home-content.service";

export async function getHomeBannerController(_req: Request, res: Response) {
  return res.json({ success: true, data: await getHomeBanner(), error: null });
}

export async function getAdminHomeBannerController(_req: Request, res: Response) {
  return res.json({ success: true, data: await getAdminHomeBanner(), error: null });
}

export async function updateHomeBannerController(req: Request, res: Response) {
  try {
    return res.json({ success: true, data: await updateHomeBanner(req.body), error: null });
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: error instanceof Error ? error.message : "INVALID_HOME_BANNER" },
    });
  }
}
