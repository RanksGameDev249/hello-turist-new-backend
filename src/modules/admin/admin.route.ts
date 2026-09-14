import { Router } from "express";

import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { decideVerification, updateUserRoleVerification } from "./admin.controller";

const router = Router();

router.patch(
  "/users/:userId/roles/:role",
  authMiddleware,
  adminMiddleware,
  updateUserRoleVerification
);

router.patch(
  "/verification/requests/:id",
  authMiddleware,
  adminMiddleware,
  decideVerification
);

export default router;
