import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { createAdminDiscoveryController, deleteAdminDiscoveryController, getDiscoveryController, listAdminDiscoveryController, listDiscoveryController, updateAdminDiscoveryController } from "./discovery.controller";

const router = Router();
router.use(authMiddleware);
router.get("/", listDiscoveryController);
router.get("/:id", getDiscoveryController);
router.get("/admin/list", adminMiddleware, listAdminDiscoveryController);
router.post("/admin", adminMiddleware, createAdminDiscoveryController);
router.patch("/admin/:id", adminMiddleware, updateAdminDiscoveryController);
router.delete("/admin/:id", adminMiddleware, deleteAdminDiscoveryController);
export default router;
