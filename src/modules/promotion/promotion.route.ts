import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { createPromotionController, deletePromotionController, getPromotionByCodeController, getPromotionController, listActivePromotionsController, updatePromotionController } from "./promotion.controller";

const router = Router();
router.get("/", listActivePromotionsController);
router.get("/code/:code", authMiddleware, getPromotionByCodeController);
router.post("/", authMiddleware, adminMiddleware, createPromotionController);
router.get("/:id", authMiddleware, adminMiddleware, getPromotionController);
router.patch("/:id", authMiddleware, adminMiddleware, updatePromotionController);
router.delete("/:id", authMiddleware, adminMiddleware, deletePromotionController);
export default router;
