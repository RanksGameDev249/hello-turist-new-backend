import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { requirePermission } from "../../middleware/rbac";
import { listAdminUsersController, listAuditLogsController } from "./admin-operations.controller";

const router = Router();
router.use(authMiddleware, adminMiddleware);
router.get("/users", requirePermission("users.read"), listAdminUsersController);
router.get("/audit-logs", requirePermission("audit.read"), listAuditLogsController);

export default router;
