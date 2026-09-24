import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { getAdminHomeBannerController, getHomeBannerController, updateHomeBannerController } from "./home-content.controller";

const router = Router();

router.get("/", authMiddleware, getHomeBannerController);
router.get("/admin", authMiddleware, adminMiddleware, getAdminHomeBannerController);
router.patch("/admin", authMiddleware, adminMiddleware, updateHomeBannerController);

export default router;
