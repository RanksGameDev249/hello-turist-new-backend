import { Router } from "express";

import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { updateUserRoleVerification } from "./admin.controller";

const router = Router();

router.patch(
  "/users/:userId/roles/:role",
  authMiddleware,
  adminMiddleware,
  updateUserRoleVerification
);

export default router;