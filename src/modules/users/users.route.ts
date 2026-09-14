import { Router } from "express";

import { authMiddleware } from "../../middleware/auth";

import { getMe, updateMe,  getRoles, addRole, updateRole,} from "./users.controller";

const router = Router();

router.get(
  "/me",
  authMiddleware,
  getMe
);

router.patch(
  "/me",
  authMiddleware,
  updateMe
);

router.get(
  "/me/roles",
  authMiddleware,
  getRoles
);

router.post(
  "/me/roles",
  authMiddleware,
  addRole
);

router.patch(
  "/me/roles/:role",
  authMiddleware,
  updateRole
);

export default router;