import type { Request, Response } from "express";
import { getRidePricing, updateRidePricing } from "../ride/fare.service";

function numberField(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`INVALID_${field}`);
  return parsed;
}

export async function getRidePricingController(_req: Request, res: Response) {
  return res.json({ success: true, data: await getRidePricing(), error: null });
}

export async function updateRidePricingController(req: Request, res: Response) {
  try {
    const data = await updateRidePricing({
      baseFare: numberField(req.body?.baseFare, "BASE_FARE"),
      perKm: numberField(req.body?.perKm, "PER_KM"),
      minimumFare: numberField(req.body?.minimumFare, "MINIMUM_FARE"), guideFee: numberField(req.body?.guideFee, "GUIDE_FEE"), gstPercent: numberField(req.body?.gstPercent, "GST_PERCENT"),
    });
    return res.json({ success: true, data, error: null });
  } catch (e) {
    const code = e instanceof Error ? e.message : "INVALID_RIDE_PRICING";
    return res.status(400).json({ success: false, data: null, error: { code, message: "Invalid ride pricing" } });
  }
}
