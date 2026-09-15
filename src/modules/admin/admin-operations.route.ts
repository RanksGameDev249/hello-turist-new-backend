import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { listAdminUsersController, listAuditLogsController } from "./admin-operations.controller";

const router = Router();
router.use(authMiddleware, adminMiddleware);
router.get("/users", listAdminUsersController);
router.get("/audit-logs", listAuditLogsController);

export default router;
