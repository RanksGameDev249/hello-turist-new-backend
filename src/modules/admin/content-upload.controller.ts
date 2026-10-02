import type { Request, Response } from "express";
import { signCloudinaryUpload } from "../../core/cloudinary";

export function signAdminContentImageUpload(req: Request, res: Response) {
  try {
    const publicId = `admin-content/${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = signCloudinaryUpload({ public_id: publicId, timestamp });
    return res.json({ success:true, data:{ cloudName:signed.cloudName, apiKey:signed.apiKey, signature:signed.signature, timestamp, publicId, resourceType:"image", type:"upload" } });
  } catch (e) {
    return res.status(503).json({ success:false,error:(e as Error).message });
  }
}
