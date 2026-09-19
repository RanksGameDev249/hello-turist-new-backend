import { Router, Request, Response } from "express";
import { createPrivateMediaUploadUrl } from "./media-upload";

const router = Router();

router.post("/upload-url", async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHENTICATED" });
    const { contentType, size, purpose } = req.body ?? {};
    const result = await createPrivateMediaUploadUrl({ userId, contentType: String(contentType ?? ""), size: Number(size), purpose: String(purpose ?? "general") });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "INVALID_MEDIA_UPLOAD" });
  }
});

export default router;
