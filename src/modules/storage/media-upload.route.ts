import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { createPrivateMediaUploadUrl } from "./media-upload";

const router = Router();
router.use(authMiddleware);

router.post("/upload-url", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { contentType, size, purpose } = req.body ?? {};
    const result = await createPrivateMediaUploadUrl({
      userId,
      contentType: String(contentType ?? ""),
      size: Number(size),
      purpose: String(purpose ?? "general"),
    });
    return res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    return res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "INVALID_MEDIA_UPLOAD" });
  }
});

export default router;
