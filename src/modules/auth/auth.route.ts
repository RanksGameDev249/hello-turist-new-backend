import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  deleteAccount,
} from "./auth.controller";

import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.delete("/account", authMiddleware, deleteAccount);
export default router;